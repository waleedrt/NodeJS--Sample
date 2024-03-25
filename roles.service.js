'use strict'

const { UsersTypesPermissions } = require('../models')
const axios = require('axios')

async function getAllRoles (data) {
  const query = []
  if (data && data.name) {
    query.push({
      role: data.name
    })
  }
  if (data && data.id) {
    query.push({ id: data.id })
  }
  return await UsersTypesPermissions.findAll(query.length > 0
    ? {
        where: {
          query
        }
      }
    : {})
}

async function addRole (data) {
  const query = []
  if (data.name) {
    data.name = data.name.trim()
    query.push({ role: data.name })
  }
  const findRole = await UsersTypesPermissions.findOne({
    where: {
      query
    }
  })
  if (findRole) {
    throw ('Role already exists')
  } else {
    return await UsersTypesPermissions.create(data)
  }
}

async function updateRole (id, data) {
  if (data.name) {
    data.name = data.name.trim()
  }
  const findRole = await UsersTypesPermissions.findOne({
    where: {
      id: id
    }
  })
  if (!findRole) {
    throw ('Role does not exists')
  } else {
    const updateRole = await UsersTypesPermissions.update(data, {
      where: {
        id: id
      },
      returning: true,
      plain: true
    })
    await pushRoles()
    return updateRole[1]
  }
}

async function deleteRole (id) {
  await UsersTypesPermissions.destroy({
    where: {
      id: id
    }
  })
  return true
}

async function pushRoles () {
  const API_ROLES_URL = `${process.env.APIS_SERVER_URL}/update-roles`
  const config = {
    method: 'post',
    url: API_ROLES_URL,
    headers: {
      'Content-Type': 'application/json'
    },
    data: JSON.stringify(await getAllRoles())
  }

  try {
    axios(config)
  } catch (err) {
    console.log('Error in pushing roles: ' + err)
  }
  return true
}

module.exports = {
  getAllRoles: getAllRoles,
  addRole: addRole,
  updateRole: updateRole,
  deleteRole: deleteRole,
  pushRoles: pushRoles
}
