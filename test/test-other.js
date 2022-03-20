// eslint-disable-next-line no-constant-condition,no-undef
const TestPromise = 0 ? Promise : ToyPromise

TestPromise.race([
  TestPromise.resolve(10),
  TestPromise.resolve(20)
]).then(
  res => {
    console.log(res)
  },
  err => {
    console.log(err)
  }
)

TestPromise.race([
  new TestPromise((resolve, reject) => {
    setTimeout(resolve, 100, 'ok')
  }),
  new TestPromise((resolve, reject) => {
    setTimeout(reject, 1000, 'err')
  })
]).then(
  res => {
    console.log(res, 'from onFulfilled')
  },
  err => {
    console.log(err, 'from onRejected')
  }
)
