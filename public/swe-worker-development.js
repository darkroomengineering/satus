/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/.pnpm/@serwist+next@9.0.0-preview.21_next@14.2.1_typescript@5.4.5_webpack@5.91.0/node_modules/@serwist/next/dist/sw-entry-worker.js":
/*!**********************************************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/@serwist+next@9.0.0-preview.21_next@14.2.1_typescript@5.4.5_webpack@5.91.0/node_modules/@serwist/next/dist/sw-entry-worker.js ***!
  \**********************************************************************************************************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\nself.onmessage = async (ev)=>{\n    switch(ev.data.type){\n        case \"__START_URL_CACHE__\":\n            {\n                const url = ev.data.url;\n                const response = await fetch(url);\n                if (!response.redirected) {\n                    const startUrlCache = await caches.open(\"start-url\");\n                    return startUrlCache.put(url, response);\n                }\n                return Promise.resolve();\n            }\n        case \"__FRONTEND_NAV_CACHE__\":\n            {\n                const url = ev.data.url;\n                const pagesCache = await caches.open(\"pages\");\n                const isPageCached = !!await pagesCache.match(url, {\n                    ignoreSearch: true\n                });\n                if (isPageCached) {\n                    return;\n                }\n                const page = await fetch(url);\n                if (!page.ok) {\n                    return;\n                }\n                pagesCache.put(url, page.clone());\n                return Promise.resolve();\n            }\n        default:\n            return Promise.resolve();\n    }\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9ub2RlX21vZHVsZXMvLnBucG0vQHNlcndpc3QrbmV4dEA5LjAuMC1wcmV2aWV3LjIxX25leHRAMTQuMi4xX3R5cGVzY3JpcHRANS40LjVfd2VicGFja0A1LjkxLjAvbm9kZV9tb2R1bGVzL0BzZXJ3aXN0L25leHQvZGlzdC9zdy1lbnRyeS13b3JrZXIuanMiLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vX05fRS8uL25vZGVfbW9kdWxlcy8ucG5wbS9Ac2Vyd2lzdCtuZXh0QDkuMC4wLXByZXZpZXcuMjFfbmV4dEAxNC4yLjFfdHlwZXNjcmlwdEA1LjQuNV93ZWJwYWNrQDUuOTEuMC9ub2RlX21vZHVsZXMvQHNlcndpc3QvbmV4dC9kaXN0L3N3LWVudHJ5LXdvcmtlci5qcz82ZDBhIl0sInNvdXJjZXNDb250ZW50IjpbInNlbGYub25tZXNzYWdlID0gYXN5bmMgKGV2KT0+e1xuICAgIHN3aXRjaChldi5kYXRhLnR5cGUpe1xuICAgICAgICBjYXNlIFwiX19TVEFSVF9VUkxfQ0FDSEVfX1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IGV2LmRhdGEudXJsO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsKTtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLnJlZGlyZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhcnRVcmxDYWNoZSA9IGF3YWl0IGNhY2hlcy5vcGVuKFwic3RhcnQtdXJsXCIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3RhcnRVcmxDYWNoZS5wdXQodXJsLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgY2FzZSBcIl9fRlJPTlRFTkRfTkFWX0NBQ0hFX19cIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBldi5kYXRhLnVybDtcbiAgICAgICAgICAgICAgICBjb25zdCBwYWdlc0NhY2hlID0gYXdhaXQgY2FjaGVzLm9wZW4oXCJwYWdlc1wiKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpc1BhZ2VDYWNoZWQgPSAhIWF3YWl0IHBhZ2VzQ2FjaGUubWF0Y2godXJsLCB7XG4gICAgICAgICAgICAgICAgICAgIGlnbm9yZVNlYXJjaDogdHJ1ZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmIChpc1BhZ2VDYWNoZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBwYWdlID0gYXdhaXQgZmV0Y2godXJsKTtcbiAgICAgICAgICAgICAgICBpZiAoIXBhZ2Uub2spIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYWdlc0NhY2hlLnB1dCh1cmwsIHBhZ2UuY2xvbmUoKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cbn07XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./node_modules/.pnpm/@serwist+next@9.0.0-preview.21_next@14.2.1_typescript@5.4.5_webpack@5.91.0/node_modules/@serwist/next/dist/sw-entry-worker.js\n"));

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = function(exports) {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/trusted types policy */
/******/ 	!function() {
/******/ 		var policy;
/******/ 		__webpack_require__.tt = function() {
/******/ 			// Create Trusted Type policy if Trusted Types are available and the policy doesn't exist yet.
/******/ 			if (policy === undefined) {
/******/ 				policy = {
/******/ 					createScript: function(script) { return script; }
/******/ 				};
/******/ 				if (typeof trustedTypes !== "undefined" && trustedTypes.createPolicy) {
/******/ 					policy = trustedTypes.createPolicy("nextjs#bundler", policy);
/******/ 				}
/******/ 			}
/******/ 			return policy;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/trusted types script */
/******/ 	!function() {
/******/ 		__webpack_require__.ts = function(script) { return __webpack_require__.tt().createScript(script); };
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/react refresh */
/******/ 	!function() {
/******/ 		if (__webpack_require__.i) {
/******/ 		__webpack_require__.i.push(function(options) {
/******/ 			var originalFactory = options.factory;
/******/ 			options.factory = function(moduleObject, moduleExports, webpackRequire) {
/******/ 				var hasRefresh = typeof self !== "undefined" && !!self.$RefreshInterceptModuleExecution$;
/******/ 				var cleanup = hasRefresh ? self.$RefreshInterceptModuleExecution$(moduleObject.id) : function() {};
/******/ 				try {
/******/ 					originalFactory.call(this, moduleObject, moduleExports, webpackRequire);
/******/ 				} finally {
/******/ 					cleanup();
/******/ 				}
/******/ 			}
/******/ 		})
/******/ 		}
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	
/******/ 	// noop fns to prevent runtime errors during initialization
/******/ 	if (typeof self !== "undefined") {
/******/ 		self.$RefreshReg$ = function () {};
/******/ 		self.$RefreshSig$ = function () {
/******/ 			return function (type) {
/******/ 				return type;
/******/ 			};
/******/ 		};
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval-source-map devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./node_modules/.pnpm/@serwist+next@9.0.0-preview.21_next@14.2.1_typescript@5.4.5_webpack@5.91.0/node_modules/@serwist/next/dist/sw-entry-worker.js"](0, __webpack_exports__, __webpack_require__);
/******/ 	
/******/ })()
;