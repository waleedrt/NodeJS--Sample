'use strict'

const AWS = require('aws-sdk')
const credentials = {
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY
}
AWS.config.update({ credentials: credentials, region: 'me-south-1' })
const s3 = new AWS.S3()

async function uploadMediaToS3 (data, fileData) {
  try {
    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: data.fileKey,
      ContentType: data.contentType,
      Body: fileData
    }
    if (data.public) {
      params.ACL = 'public-read'
    }

    return s3.putObject(params, function (err, data) {
      if (err) console.log(err, err.stack)
      console.log('File Uploaded: ', params.Key)
    })
  } catch (err) {
    console.log('Error in Upload is: ', err)
    return null
  }
}

function getS3MediaURLSync (mediaList) {
  try {
    if (!mediaList || mediaList.length === 0) return []
    let url = ''
    mediaList.forEach(m => {
      if (m.isPublic) {
        url = `https://s3.${process.env.AWS_REGIONAL_HANDLE}.amazonaws.com/${process.env.S3_BUCKET}/${m.s3Path}`
      } else {
        const params = {
          Bucket: process.env.S3_BUCKET,
          Key: m.s3Path,
          Expires: 60 * 60 // time to expire in seconds
        }
        url = s3.getSignedUrl('getObject', params)
      }
      m.s3DownloadUrl = url
    })
    return mediaList
  } catch (err) {
    console.log('Error in Upload is: ', err)
    return null
  }
}

async function deleteMediaFromS3 (fileKey) {
  try {
    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: fileKey
    }

    const retVal = await s3.deleteObject(params).promise()
    return retVal
  } catch (err) {
    console.log('Error in Upload is: ', err)
    return null
  }
}

module.exports = {
  uploadMediaToS3: uploadMediaToS3,
  getS3MediaURLSync: getS3MediaURLSync,
  deleteMediaFromS3: deleteMediaFromS3
}
