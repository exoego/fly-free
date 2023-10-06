import * as Promise from 'bluebird'

import type { Draft } from '~/models/Draft'
import type { Message } from '~/models/Message'
import { convertDraft2Post, type Post } from '~/models/Post'
import { createBlueskyBackend } from '~/models/ServiceBluesky'
import type { ServiceName } from '~/models/ServiceName'
import type { ServicePreference } from '~/models/ServicePreference'
import { createStoreAsync } from '~/models/Store'

chrome.action.onClicked.addListener(async (tab) => {
  const urlParams = new URLSearchParams({
    text: tab.title,
    url: tab.url,
  })

  await chrome.windows.create({
    url: `https://twitter.com/intent/tweet?${urlParams.toString()}`,
    type: 'popup',
    width: 600,
    height: 400,
  })
})

chrome.runtime.onMessage.addListener(async (request, sender) => {
  const receivedMessage = request as Message
  if (!receivedMessage || receivedMessage.type !== 'Post') return

  const { draft, services } = receivedMessage
  const tabID = sender.tab.id
  const draftObj: Draft = JSON.parse(draft)
  const postData = await convertDraft2Post(draftObj)

  await Promise.mapSeries(
    services.filter((s) => s !== 'Twitter'),
    async (service: Exclude<ServiceName, 'Twitter'>) => {
      const store = await createStoreAsync(service)
      let post: (post: Post, preference: ServicePreference) => Promise<string>
      switch (service) {
        case 'Bluesky':
          const { post: postBluesky } = createBlueskyBackend(store)
          post = postBluesky
          break
        case 'Taittsuu':
          // TODO: after Taittsuu API
          throw new Error('unimplemented')
      }

      const result: string | Error = await post(postData, store.data).catch(
        (error: Error) => {
          return error
        },
      )

      let message: Message
      if (result instanceof Error) {
        message = {
          type: 'Error',
          service,
          message: result.message,
        }
      } else {
        message = {
          type: 'Success',
          service,
          url: result,
        }
      }
      await chrome.tabs.sendMessage(tabID, message)
    },
  )

  if (services.some((s) => s === 'Twitter')) {
    const twitterMessage: Message = {
      type: 'Tweet',
    }
    await chrome.tabs.sendMessage(tabID, twitterMessage)
  }

  chrome.runtime.onMessage.removeListener(() => {})
})
