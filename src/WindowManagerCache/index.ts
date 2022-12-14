import { isEmpty, get } from 'lodash'
import { CacheObject, WindowManagerCacheType } from './WindowManagerCache'

class WindowManagerCache extends Object implements WindowManagerCacheType {
  readonly #dataKey: string
  #win: Window
  #cache: CacheObject

  constructor(win: Window) {
    super()
    this.#dataKey = 'window_manager_cache'
    this.#win = win
    this.#cache = new Proxy(
      { [this.#win.name]: [] },
      {
        get: (target, property) => target[property as string],
        set: (target, property, value) => {
          target[property as string] = value
          this.updateStorage(target)
          return true
        }
      }
    )
  }

  public removeItemFromCache(item: string) {
    if (typeof item !== 'string')
      throw new TypeError(
        'WindowManagerCache.removeItemFromCache() item must be a string'
      )
    const cache = this.getCache()
    if (isEmpty(cache)) return
    this.hardSetCache(cache[this.#win.name].filter(name => item !== name))
  }

  public addItemToCache(item: string) {
    if (typeof item !== 'string')
      throw new TypeError(
        'WindowManagerCache.addItemFromCache() item must be a string'
      )
    const cache = this.getCache()
    const temp = cache[this.#win.name]
    cache[this.#win.name] = [...temp, item]
  }

  public getCache(): CacheObject {
    return this.#cache
  }

  public init() {
    const cacheData = this.getFromStorage()
    cacheData
      ? this.hardSetCache(get(cacheData, this.#win.name, []))
      : this.clearCache()
    return this
  }

  /**
   * Takes in an array of window names and sets the key of `this.#win.name` to the new array
   * @param data an array of window names
   */
  private hardSetCache(data: string[]) {
    if (typeof data !== 'object')
      throw new TypeError(
        'WindowManagerCache.hardSetCache() data must be an array of string'
      )
    this.#cache[this.#win.name] = data
  }

  /**
   * sets the cache to an empty array
   */
  private clearCache() {
    this.hardSetCache([])
  }

  /**
   * Adds a CacheObject to session storage for window name persistance
   * @param data the CacheObject to update the browser cache to
   */
  private updateStorage(data: CacheObject) {
    if (typeof data !== 'object')
      throw new TypeError(
        'WindowManagerCache.updateStorage() data must be an object'
      )
    sessionStorage.setItem(this.#dataKey, JSON.stringify(data))
  }

  /**
   * pulls the cache from session storage. If there is no cache, returns a falsy value
   * @returns a CacheObject or undefined
   */
  private getFromStorage(): CacheObject | undefined {
    const data = sessionStorage.getItem(this.#dataKey)
    if (!data) return
    const cache: CacheObject = JSON.parse(data)
    return cache
  }
}

export default WindowManagerCache
