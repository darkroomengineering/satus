const formatError = (e) => {
  try {
    if (typeof e === 'string' ? { message: e } : e) {
      switch (typeof e) {
        case 'string':
          return { message: e }
        default:
        case 'object': {
          const anyError = e
          return { message: anyError.message, code: anyError.code }
        }
      }
    }
  } catch (error) {
    return { message: 'An unknown error ocurred.' }
  }
}

function success(res, json) {
  return res.status(200).json(json)
}

function badRequest(res, error = 'Bad request') {
  console.error(error)
  return res.status(400).json({ error: formatError(error) })
}

function notAuthorized(res, error = 'Not authorized') {
  console.error(error)
  return res.status(401).json({ error: formatError(error) })
}

function notFound(res, error = 'Not found') {
  console.error(error)
  return res.status(404).json({ error: formatError(error) })
}

function internalServerError(res, error) {
  console.error(error)
  return res.status(500).json({ error: formatError(error) })
}

function redirect(res, location = '/') {
  res.writeHead(302, { Location: location })
  return res.end()
}

export {
  success,
  badRequest,
  notAuthorized,
  notFound,
  internalServerError,
  redirect,
}
