'use strict'

function isSassType(value) {
  return /^Sass|sass\.types\./.exec(value.constructor.name)
}

function getSassType(value) {
  if (value.typeOf) {
    return value.typeOf()
  }

  var constructor = value.constructor

  if (!constructor.utilSassType) {
    constructor.utilSassType = constructor.name
      // matches SassType, sass.types.Type, _SassType0;
      // also strips the `ean` from`Boolean`(for consistency with `#typeOf()`)
      .replace(/^_?(?:Sass|sass\.types\.)(\D+?)(?:ean)?\d*$/, '$1')
      .toLowerCase()
  }

  return constructor.utilSassType
}

module.exports = {}
module.exports.isSassType = isSassType
module.exports.getSassType = getSassType
