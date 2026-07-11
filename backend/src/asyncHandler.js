// Express 4 不會自動處理 async route handler 裡的 rejected promise，
// 沒接住的話會變成 unhandled rejection，Node 預設會直接把 process 終止。
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}
