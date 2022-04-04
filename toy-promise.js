/**
 * a sample toy promise
 */

// 定义 promise 的状态
const states = {
  PENDING: 'pending',
  FULFILLED: 'fulfilled',
  REJECTED: 'rejected'
}
// 判断一个对象是不是 thenable
const isThenable = (value) => value && (typeof value.then === 'function')
// 异步函数 TODO 考虑 setImmediate
const delayFn = setTimeout

// 使用类实现 ToyPromise
// eslint-disable-next-line no-unused-vars
class ToyPromise {
  // TODO 使用私有属性实现一遍 需要升级 eslint
  constructor (computation, isAsync = true) {
    // 定义 promise 的初始状态
    this._state = states.PENDING
    // 定义初始的 promise 被完成的值
    this._value = undefined
    // 定义初始的 promise 拒绝的原因
    this._reason = undefined

    // 定义当前 promise 的 then 队列
    this._thenQueue = []
    // 定义当前 promise 的 finally 队列
    this._finallyQueue = []

    // 判断构造 promise 的运算函数是否存在，只有存在才会进行运算
    // TODO 判断 computation 是否是函数
    if (computation) {
      // 同步执行的 computation 函数
      try {
        computation(
          // bind(this) 是为了在方法内部可以获取当前 promise 的 this
          this._onFulfilled.bind(this),
          this._onRejected.bind(this)
        )
      } catch (e) {
        // 处理抛出的异常
        this._onRejected(e)
      }
      // // 异步执行 computation 函数
      // const fn = () => {}
      // if (isAsync) {
      //   // TODO 暂时使用 setTimeout 代替，后续可以优化
      //   setTimeout(fn)
      // } else {
      //   // 用于 ToyPromise.all 处理同步返回的 promise
      //   fn()
      // }
    }
  }

  // 定义当前 promise 被完成执行的方法
  _onFulfilled (value) {
    // 只有当前状态是 pending 状态才可以变更 promise 的状态
    if (this._state === states.PENDING) {
      // 获取 resolve 的值
      this._value = value
      // 变更 promise 的状态
      this._state = states.FULFILLED
      // 处理当前 promise 的完成状态回调链
      this._handleFulfilledQueue()
    }
  }

  // 当前 promise 被拒绝执行的方法
  _onRejected (reason) {
    if (this._state === states.PENDING) {
      this._reason = reason
      this._state = states.REJECTED
      // 处理当前 promise 的拒绝状态回调链
      this._handleRejectedQueue()
    }
  }

  // 定义当前 promise 的 then 方法
  then (onFulfilled, onRejected) {
    // then 方法返回的是一个 promise 所以需要新创建一个 promise
    const nextPromise = new ToyPromise()
    // then 队列保存的是一个数组，分别是：返回的下一个 promise，当前 then 方法的完成和拒绝方法
    this._thenQueue.push([nextPromise, onFulfilled, onRejected])
    // 判断当前 promise 的状态；如果状态发生了变换，需要调用不同的处理函数
    if (this._state === states.FULFILLED) {
      this._handleFulfilledQueue()
    } else if (this._state === states.REJECTED) {
      this._handleRejectedQueue()
    }
    return nextPromise
  }

  // 定义当前 promise 的 catch 方法
  catch (onRejected) {
    // catch 其实就是没有没有 onFulfilled 处理函数的 then 方法
    // 另外要注意的是 catch 方法返回的也是一个 promise；所以这里需要添加 return
    return this.then(undefined, onRejected)
  }

  // 定义当前 promise 的 finally 方法
  finally (sideEffect) {
    // 只执行副作用函数，不对 promise 的值做改变；返回的值仍然是一个新的 promise
    // 判断当前 promise 的状态
    if (this._state !== states.PENDING) {
      // 直接运行对应的副作用函数
      if (sideEffect) {
        // 执行出错的判断
        try {
          sideEffect()
        } catch (e) {
          return ToyPromise.reject(e)
        }
      }
      // 需要返回一个新的 promise
      return this._state === states.FULFILLED ? ToyPromise.resolve(this._value) : ToyPromise.reject(this._reason)
    } else {
      // 当前 promise 还在 pending 状态
      const nextPromise = new ToyPromise()
      this._finallyQueue.push([nextPromise, sideEffect])
      return nextPromise
    }
  }

  // 传递当前当前 promise 的完成状态
  _handleFulfilledQueue () {
    delayFn(() => {
      // 遍历 then 队列中对成功完成状态的处理回调
      this._thenQueue.forEach(([nextPromise, onFulfilled]) => {
        // 首先判断 onFulfilled 是否存在
        if (onFulfilled) {
          let onFulfilledVal
          // 执行出错的处理
          try {
            // TODO 判断 onFulfilled 是不是一个函数
            onFulfilledVal = onFulfilled(this._value)
          } catch (e) {
            // 需要传递拒绝状态给 nextPromise
            nextPromise._onRejected(e)
          }
          // 判断 then 方法中 被成功完成后的返回值是否是一个 promise
          if (isThenable(onFulfilledVal)) {
            // 需要在 onFulfilledVal 这个 promise 的状态改变之后传递给返回的 nextPromise
            onFulfilledVal.then(
              val => nextPromise._onFulfilled(val),
              reason => nextPromise._onRejected(reason)
            )
          } else {
            nextPromise._onFulfilled(onFulfilledVal)
          }
        } else {
          // 传递上一个 promise 的完成状态
          nextPromise._onFulfilled(this._value)
        }
      })

      // 遍历 finallyQueue
      this._finallyQueue.forEach(([nextPromise, sideEffect]) => {
        if (sideEffect) {
          try {
            sideEffect()
          } catch (e) {
            nextPromise._onRejected(e)
          }
        }
        nextPromise._onFulfilled(this._value)
      })
      // 需要重置 then 队列
      this._thenQueue = []
      // 重置 finally 队列
      this._finallyQueue = []
    })
  }

  // 传递当前 promise 的拒绝状态
  _handleRejectedQueue () {
    delayFn(() => {
      // 遍历 then 队列中 对拒绝状态的处理函数
      // 因为 onFulfilled 在这里没有用，所以使用 _ 替代
      this._thenQueue.forEach(([nextPromise, _, onRejected]) => {
        // 首先判断 onRejected 是否存在
        if (onRejected) {
          let onRejectedVal
          // 执行出错的处理
          try {
            // TODO onRejected 是否是函数的判断
            onRejectedVal = onRejected(this._reason)
          } catch (e) {
            // 传递给下一个 promise
            nextPromise._onRejected(e)
          }
          // 判断返回的是否是一个 promise
          if (isThenable(onRejectedVal)) {
            onRejectedVal.then(
              val => nextPromise._onFulfilled(val),
              reason => nextPromise._onRejected(reason)
            )
          } else {
            // 需要注意，这里会把 onRejected 执行的结果 作为成功完成的状态传递给下一个 promise
            nextPromise._onFulfilled(onRejectedVal)
          }
        } else {
          // 传递上一个 promise 的拒绝状态
          nextPromise._onRejected(this._reason)
        }
      })
      // 遍历 finallyQueue
      this._finallyQueue.forEach(([nextPromise, sideEffect]) => {
        if (sideEffect) {
          try {
            sideEffect()
          } catch (e) {
            nextPromise._onRejected(e)
          }
        }
        // 需要把当前拒绝的原因传递给下一个 promise
        nextPromise._onRejected(this._reason)
      })

      // 重置队列
      this._thenQueue = []
      // 重置 finally 队列
      this._finallyQueue = []
    })
  }
}

// TODO Promise.resolve Promise.reject 可以使用静态属性来实现
ToyPromise.resolve = (value) => {
  return new ToyPromise((resolve) => resolve(value))
}
ToyPromise.reject = (reason) => {
  return new ToyPromise((_, reject) => reject(reason))
}

// 实现 race 暂时使用数组表示 iterable
ToyPromise.race = (promises) => {
  // 因为返回的也是一个 promise 所以需要创建一个新的 promise
  const nextPromise = new ToyPromise()
  for (const p of promises) {
    // 因为只有最先改变状态的 promise 才会将结果传递给返回的 nextPromise
    p.then(
      value => nextPromise._onFulfilled(value),
      reason => nextPromise._onRejected(reason)
    )
  }
  return nextPromise
}

ToyPromise.all = (promises) => {
  // 首先判断 数组是否为空，如果是个空数组需要立即返回一个 同步的状态是被解决的 promise
  if (promises.length === 0) {
    return new ToyPromise((resolve) => {
      resolve([])
    }, false)
  }
}
