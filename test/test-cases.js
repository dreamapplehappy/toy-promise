// eslint-disable-next-line no-undef,no-constant-condition
const TestPromise = 1 ? Promise : ToyPromise

console.log(`当前的 Promise 是：${TestPromise === Promise ? 'Promise' : 'ToyPromise'}`)

const p1 = new TestPromise((resolve, reject) => {
  // resolve(1)
  // reject(0)
  throw new Error('computation error')
  // TODO 只有第一次的 resolve 起作用
  // resolve(2)
})

p1
  .then()
  .then(
    (val) => {
      console.log(`${val} from 1`)
    },
    (err) => {
      console.log(err, 'from 2')
      throw new Error('err===')
    }
  )
  .catch((err) => {
    console.log(err, 'from catch')
    // throw new Error('888')
    // return 3
  })
  .finally(() => {
    console.log('from finally')
    throw new Error('from finally')
  })
  .then(
    (val) => {
      console.log(`${val} from 3`)
    },
    (err) => {
      console.log(err, 'from 4')
    }
  )

setTimeout(() => {
  p1.finally(() => {
    throw new Error('999')
  }).then((res) => {
    console.log(res)
  }, (err) => {
    console.log(err)
  })
}, 1000)

console.log('=== sync end ===')
