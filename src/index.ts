import { WindowManagerType } from './WindowManager'
import WindowManagerCache from './WindowManagerCache'
import { remove, forEachRight, forEach } from 'lodash'

declare global {
  interface Window {
    /**
     * A window manager that keeps track of all open child windows, opened by this instance.
     * It is responsible for traversing the tree of windows and closing from furthest depth first.
     *
     * This class will instantiate itself and attach itself to the window object on first import
     *
     * Add an import to your entry file like so:
     * ``` typescript
     * import 'PATH_TO_WINDOW_MANAGER'
     * ```
     *
     * Then use the managers available functions by accessing it via the window object
     * ``` typescript
     * window.WindowManager.CallFunction()
     * ```
     *
     * @example ``` typescript
     * // you can use this when logging out if you want to ensure all child windows are closed
     * const logout = () => {
     * // do some stuff
     * window.WindowManager.recursivelyCloseChildren()
     * }
     * ```
     */
    WindowManager: WindowManager
  }
}

/**
 * A window manager that keeps track of all open child windows, opened by this instance.
 */
class WindowManager implements WindowManagerType {
  readonly #win: Window
  readonly #newWindowDetails: Record<string, number>
  #children: Window[]
  #windowManagerCache?: WindowManagerCache
  #onUnloadCallbacks: (() => void)[]
  #parent: Window

  constructor(win: Window) {
    this.#win = win
    this.#parent = win.opener
    this.#children = []
    this.#onUnloadCallbacks = []
    this.#newWindowDetails = {
      WIDTH: 900,
      HEIGHT: 600,
      LEFT: 0,
      RIGHT: 0
    }
  }

  public openWindow = (windowProperties: { link: string; name?: string }) => {
    const { link, name } = windowProperties
    if (typeof link !== 'string')
      throw new TypeError(
        `WindowManager.openWindow requires link to be given as a String`
      )
    if (!['undefined', 'string'].includes(typeof name))
      throw new TypeError(
        `WindowManager.openWindow requires name to be given as String or undefined`
      )
    const childWindow = this.#win.open(
      link,
      name || link,
      `
        width=${this.#newWindowDetails.WIDTH}, 
        height=${this.#newWindowDetails.HEIGHT}, 
        left=${this.#newWindowDetails.LEFT},
        top=${this.#newWindowDetails.TOP},
        resizable=yes, 
        scrollbars=yes
       `
    )
    if (!childWindow) return
    this.setChild(childWindow)
    if (link) return this.#windowManagerCache?.addItemToCache(childWindow.name)
    if (childWindow.document?.URL !== 'about:blank') return
    childWindow.close()
    this.#windowManagerCache?.removeItemFromCache(name as string)
  }

  public popThisWindowFromParent = (childWindowName: string) => {
    if (typeof childWindowName !== 'string')
      throw new TypeError(
        'WindowManager.popThisWindowFromParent requires childWindowName to be given as a string'
      )
    this.#children = remove(this.#children, kid => kid.name !== childWindowName)
    this.#windowManagerCache?.removeItemFromCache(childWindowName)
  }

  public recursivelyCloseChildren = (id = 0) => {
    if (typeof id !== 'number')
      throw new TypeError(
        'WindowManager.recursivelyCloseChildren requires id to be given as a number'
      )
    if (this.hasChildren) {
      const copy = [...this.#children]
      forEachRight(copy, child => {
        child?.WindowManager?.recursivelyCloseChildren(id + 1)
      })
    }
    if (!id) return
    this.close()
  }

  public newUnloadCallback(cb: () => void) {
    if (typeof cb !== 'function')
      throw new TypeError(
        'Windowmanager.newUnloadCallback requires cb to be given as a function'
      )
    this.#onUnloadCallbacks.push(cb)
  }

  public init = (): this => {
    window.addEventListener('beforeunload', e => this.handleUnload())
    this.#win.WindowManager = this
    if (!this.#win.name) this.#win.name = 'main'
    this.#windowManagerCache = new WindowManagerCache(this.#win).init()
    forEach(this.#windowManagerCache.getCache()[this.#win.name], name =>
      this.openWindow({ link: '', name })
    )
    return this
  }

  /**
   * Gets the length of `this.#children` and type casts it to boolean
   * @returns boolean
   */
  private get hasChildren() {
    return !!this.#children.length
  }

  /**
   * Calls `this.#win.close()` on this instance to close itself
   */
  private close = () => {
    const p = this.#parent
    if (!!p) p.WindowManager.popThisWindowFromParent(this.#win.name)
    this.#win.close()
  }

  /**
   * Takes a window reference and adds it
   */
  private setChild(child: Window) {
    if (typeof child !== 'object' || !child)
      throw new TypeError(
        'WindowManager.setChild requires child to be a Window object'
      )
    this.#children = [...new Set([...this.#children, child])].filter(
      kid => !kid.closed
    )
  }

  /**
   * Removes this window from the parent window's window manager.
   * It calls each callback assigned to `this.#onUnloadCallbacks`
   */
  private handleUnload() {
    this.#parent.WindowManager.popThisWindowFromParent(this.#win.name)
    forEach(this.#onUnloadCallbacks, cb => cb())
  }
}

const NewWindowManagerInstance = new WindowManager(window).init()
window.WindowManager = NewWindowManagerInstance
export default NewWindowManagerInstance
