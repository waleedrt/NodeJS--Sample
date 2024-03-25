'use strict'

const { uploadMulterFileToS3 } = require('./files.service')
const { deleteMediaFromS3 } = require('./s3.service')
const db = require('../models/index')
const { QueryTypes } = require('sequelize')

async function getCurrentMediaList (targetValue, mediaConfig) {
  const query = `select * from ${mediaConfig.target_table} where ${mediaConfig.where_clause} '${targetValue}'`
  const targetObj = await db.sequelize.query(query, {
    type: QueryTypes.SELECT
  })

  if (!targetObj || targetObj.length === 0) {
    return null
  }

  return targetObj[0][mediaConfig.target_column]
}

async function uploadMedia (medalycId, config, data, files) {
  const mediaList = await getCurrentMediaList(medalycId, config)
  if (!mediaList) {
    throw ('Invalid medalyc id.')
  }
  if (files) {
    if (files.media && files.media[0]) {
      const update = await uploadMulterFileToS3(files.media[0], {
        medalycId: medalycId,
        type: config.target_column,
        public: config.is_public,
        video: config.is_video
      })

      if (data.media_info && Object.keys(data.media_info).length !== 0) {
        update.media_info = data.media_info
      }
      mediaList.push(update)
    }
  }
  const arrayUpdate = mediaList.map(object => `'${JSON.stringify(object)}'`)
  const query = `update ${config.target_table} set ${config.target_column} = (array[ ${arrayUpdate} ]::jsonb[]) where ${config.where_clause} '${medalycId}'`
  await db.sequelize.query(query, { type: QueryTypes.RAW })
}

async function deleteMedia (medalycId, config, data) {
  const mediaList = await getCurrentMediaList(medalycId, config)
  if (!mediaList) {
    throw ('Invalid medalyc id.')
  }
  if (mediaList.length === 0) {
    throw ('No such file exists.')
  }
  const updatedMediaList = mediaList.filter(function (value, index, arr) {
    return value.s3Path !== data.file_key
  })

  if (updatedMediaList.length === mediaList.length) {
    throw ('No such file exists.')
  }

  await deleteMediaFromS3(data.file_key)

  const arrayUpdate = updatedMediaList.map(object => `'${JSON.stringify(object)}'`)
  const query = `update ${config.target_table} set ${config.target_column} = (array[ ${arrayUpdate} ]::jsonb[]) where ${config.where_clause} '${medalycId}'`
  await db.sequelize.query(query, { type: QueryTypes.RAW })
}

module.exports = {
  uploadMedia: uploadMedia,
  deleteMedia: deleteMedia
}
