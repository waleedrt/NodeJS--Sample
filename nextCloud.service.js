'use strict'

const axios = require('axios')
const { AppointmentNextCloud } = require('../models/index')
const qs = require('qs')

const CONVERSATION_URL = `${process.env.NEXTCLOUD_BASE_URL}/ocs/v2.php/apps/spreed/api/v4/room`
const PARTICIPANT_URL = `${process.env.NEXTCLOUD_BASE_URL}/ocs/v2.php/apps/spreed/api/v4/room`

async function createConversations (data, createClinicChat) {
  const doctorChatToken = await createConversation(data)
  await setConversationPermissions(doctorChatToken)
  await addParticipants(doctorChatToken, [data.doctor_id, data.patient_id])
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  await delay(3000)
  const docAttendeeId = await getDoctorAttendeeIds(doctorChatToken, data)
  await setAttendeePermissions(doctorChatToken, docAttendeeId)

  let clinicChatToken = ''
  if (createClinicChat) {
    // TODO: Get clinic users list
    clinicChatToken = await createConversation(data)
    await setConversationPermissions(clinicChatToken)
    await addParticipants(clinicChatToken, [data.doctor_id, data.patient_id])
    await delay(3000)
    const docAttendeeId = await getDoctorAttendeeIds(doctorChatToken, data)
    await setAttendeePermissions(clinicChatToken, docAttendeeId)
  }

  await AppointmentNextCloud.create({
    appointmentId: data.appointment_id,
    doctorChatToken: doctorChatToken,
    clinicChatToken: clinicChatToken
  })
}

async function getDoctorAttendeeIds (chatToken, data) {
  const config = {
    method: 'get',
    url: `${PARTICIPANT_URL}/${chatToken}/participants`,
    headers: { 'OCS-APIRequest': 'true' },
    auth: {
      username: process.env.NEXTCLOUD_AMDIN_USER,
      password: process.env.NEXTCLOUD_AMDIN_PASS
    }
  }

  const res = await axios(config)
  console.log(res.data.ocs.data, ' Attendee List')
  const doc = res.data.ocs.data.find((user) => {
    return user.attendeeId
  })
  return doc?.attendeeId
}

async function setConversationPermissions (chatToken) {
  const requestData = {
    permissions: 113 // no call permission
  }

  const config = {
    method: 'put',
    url: `${PARTICIPANT_URL}/${chatToken}/permissions/default`,
    headers: {
      'OCS-APIRequest': 'true',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    auth: {
      username: process.env.NEXTCLOUD_AMDIN_USER,
      password: process.env.NEXTCLOUD_AMDIN_PASS
    },
    data: qs.stringify(requestData)
  }

  const res = await axios(config)
  if (res.status !== 200) {
    console.log(`Set conversation default permissions failed for ${chatToken}`)
    console.log(res.data)
  }
}

async function setAttendeePermissions (chatToken, attendeeId) {
  if (!attendeeId) {
    console.log(`Invalid attendeeId: ${attendeeId}`)
    return
  }

  const requestData = {
    attendeeId: attendeeId,
    mode: 'set',
    permissions: 115 // start call permission
  }

  const config = {
    method: 'post',
    url: `${PARTICIPANT_URL}/${chatToken}/attendees/permissions`,
    headers: {
      'OCS-APIRequest': 'true',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    auth: {
      username: process.env.NEXTCLOUD_AMDIN_USER,
      password: process.env.NEXTCLOUD_AMDIN_PASS
    },
    data: qs.stringify(requestData)
  }

  const res = await axios(config)
  if (res.status !== 200) {
    console.log(`Set attendees/permissions failed for user ${attendeeId}`)
    console.log(res.data)
  }
}
// especially for test cases
async function deleteConversation (chatToken) {
  const config = {
    method: 'delete',
    url: `${PARTICIPANT_URL}/${chatToken}`,
    headers: {
      'OCS-APIRequest': 'true',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    auth: {
      username: process.env.NEXTCLOUD_AMDIN_USER,
      password: process.env.NEXTCLOUD_AMDIN_PASS
    }
  }

  const res = await axios(config)
  if (res.status !== 200) {
    console.log(`Cannot delete conversation ${chatToken}`)
    console.log(res.data)
  }
}

async function createConversation (data) {
  const participantData = {
    roomType: 3, // public chat
    roomName: data.roomName
  }

  const config = {
    method: 'post',
    url: CONVERSATION_URL,
    headers: {
      'OCS-APIRequest': 'true',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    auth: {
      username: process.env.NEXTCLOUD_AMDIN_USER,
      password: process.env.NEXTCLOUD_AMDIN_PASS
    },
    data: qs.stringify(participantData)
  }

  const res = await axios(config)
  return res.data.ocs.data.token
}

async function addParticipants (chatToken, users) {
  users.forEach(async (user) => {
    const participantData = {
      newParticipant: user,
      source: 'users'
    }

    const config = {
      method: 'post',
      url: `${PARTICIPANT_URL}/${chatToken}/participants`,
      headers: {
        'OCS-APIRequest': 'true',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      auth: {
        username: process.env.NEXTCLOUD_AMDIN_USER,
        password: process.env.NEXTCLOUD_AMDIN_PASS
      },
      data: qs.stringify(participantData)
    }

    const res = await axios(config)
    if (res.status !== 200) {
      console.log(`Add participant failed for user ${user}`)
      console.log(res.data)
    }
  })
}

async function archiveConversation (chatToken) {
  const requestData = {
    state: 1
  }
  const config = {
    method: 'post',
    url: `${PARTICIPANT_URL}/${chatToken}/read-only`,
    headers: {
      'OCS-APIRequest': 'true'
    },
    auth: {
      username: process.env.NEXTCLOUD_AMDIN_USER,
      password: process.env.NEXTCLOUD_AMDIN_PASS
    },
    data: qs.stringify(requestData)
  }
  const res = await axios(config)
  if (res.status !== 200) {
    console.log(`Cannot set readonly for conversation ${chatToken}`)
    console.log(res.data)
  }
}

async function makePublic (chatToken) {
  const config = {
    method: 'post',
    url: `${PARTICIPANT_URL}/${chatToken}/public`,
    headers: {
      'OCS-APIRequest': 'true',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    auth: {
      username: process.env.NEXTCLOUD_AMDIN_USER,
      password: process.env.NEXTCLOUD_AMDIN_PASS
    }
  }
  const res = await axios(config)
  if (res.status !== 200) {
    console.log(`Cannot set guest access for conversation ${chatToken}`)
    console.log(res.data)
  }
}

async function setConversationPassword (chatToken, password) {
  const requestData = {
    password: password
  }

  const config = {
    method: 'put',
    url: `${PARTICIPANT_URL}/${chatToken}/password`,
    headers: {
      'OCS-APIRequest': 'true',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    auth: {
      username: process.env.NEXTCLOUD_AMDIN_USER,
      password: process.env.NEXTCLOUD_AMDIN_PASS
    },
    data: qs.stringify(requestData)
  }
  const res = await axios(config)
  if (res.status !== 200) {
    console.log(`Cannot set password for conversation ${chatToken}`)
    console.log(res.data)
  }
}

async function getPublicLinkWithPassword (chatToken, password) {
  await makePublic(chatToken)
  await setConversationPassword(chatToken, password)
  return `${PARTICIPANT_URL}/${chatToken}`
}

module.exports = {
  createConversations: createConversations,
  deleteConversation: deleteConversation,
  createConversation: createConversation,
  addParticipants: addParticipants,
  archiveConversation: archiveConversation,
  getPublicLinkWithPassword: getPublicLinkWithPassword
}
