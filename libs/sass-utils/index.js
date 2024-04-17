// https://github.com/sass-eyeglass/node-sass-utils/blob/master/lib/coercion.js

import * as sass from 'sass'
import { isSassType } from './utils.js'

function hexToRGB(hex) {
  if (!/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex))
    throw new Error(`Invalid hex: ${hex}`)

  let c = hex.substring(1).split('')
  if (c.length == 3) {
    c = [c[0], c[0], c[1], c[1], c[2], c[2]]
  }
  c = `0xff${c.join('')}`
  return Number(c)
}

export function castToSass(jsValue) {
  if (jsValue && typeof jsValue.toSass === 'function') {
    // string -> unquoted string
    return jsValue.toSass()
  } else if (typeof jsValue === 'string') {
    // string -> unquoted string

    if (jsValue.includes('px')) {
      return new sass.types.Number(Number(jsValue.replace('px', '')), 'px')
    } else if (jsValue.startsWith('#')) {
      //TODO: accept rgb values
      return new sass.types.Color(hexToRGB(jsValue))
    } else {
      return new sass.types.String(jsValue)
    }
  } else if (typeof jsValue === 'boolean') {
    // boolean -> boolean
    return jsValue ? sass.types.Boolean.TRUE : sass.types.Boolean.FALSE
  } else if (typeof jsValue === 'undefined' || jsValue === null) {
    // undefined/null -> null
    return sass.types.Null.NULL
  } else if (typeof jsValue === 'number') {
    // Js Number -> Unitless Number
    return new sass.types.Number(jsValue)
  } else if (jsValue && jsValue.constructor.name === 'Array') {
    // Array -> List
    var list = new sass.types.List(jsValue.length)
    for (var i = 0; i < jsValue.length; i++) {
      list.setValue(i, this.castToSass(jsValue[i]))
    }
    var isComma =
      typeof jsValue.separator === 'undefined' ? true : jsValue.separator
    list.setSeparator(isComma)
    return list
  } else if (jsValue === sass.types.Null.NULL) {
    // no-op if sass.types.Null.NULL
    return jsValue
  } else if (jsValue && isSassType(jsValue)) {
    // these are sass objects that we don't coerce
    return jsValue
  } else if (typeof jsValue === 'object') {
    var keys = []
    for (var k in jsValue) {
      if (jsValue.hasOwnProperty(k)) {
        keys[keys.length] = k
      }
    }
    var map = new sass.types.Map(keys.length)
    for (var m = 0; m < keys.length; m++) {
      var key = keys[m]
      map.setKey(m, new sass.types.String(key))
      map.setValue(m, this.castToSass(jsValue[key]))
    }
    return map
  } else {
    // WTF
    throw new Error("Don't know how to coerce: " + jsValue.toString())
  }
}
