export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function callWithRetry(fn, userMessage) {
  try {
    return { success: true, data: await fn() }
  } catch (error) {
    console.error('[DashPlot]', error)
    if (error.status === 503 || error.status === 429) {
      await sleep(3000)
      try { return { success: true, data: await fn() } }
      catch (e) { console.error('[DashPlot] retry failed', e) }
    }
    return { success: false, userMessage }
  }
}
