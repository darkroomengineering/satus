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

/***/ "./node_modules/.pnpm/@serwist+next@9.0.3_next@14.2.4_@babel+core@7.24.7_react-dom@18.3.1_react@18.3.1__react@18.3._kcqwwrjw4kp2bvixef2kwvzqwe/node_modules/@serwist/next/dist/sw-entry-worker.js":
/*!********************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/@serwist+next@9.0.3_next@14.2.4_@babel+core@7.24.7_react-dom@18.3.1_react@18.3.1__react@18.3._kcqwwrjw4kp2bvixef2kwvzqwe/node_modules/@serwist/next/dist/sw-entry-worker.js ***!
  \********************************************************************************************************************************************************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\nself.onmessage = async (ev)=>{\n    switch(ev.data.type){\n        case \"__START_URL_CACHE__\":\n            {\n                const url = ev.data.url;\n                const response = await fetch(url);\n                if (!response.redirected) {\n                    const startUrlCache = await caches.open(\"start-url\");\n                    return startUrlCache.put(url, response);\n                }\n                return Promise.resolve();\n            }\n        case \"__FRONTEND_NAV_CACHE__\":\n            {\n                const url = ev.data.url;\n                const pagesCache = await caches.open(\"pages\");\n                const isPageCached = !!await pagesCache.match(url, {\n                    ignoreSearch: true\n                });\n                if (isPageCached) {\n                    return;\n                }\n                const page = await fetch(url);\n                if (!page.ok) {\n                    return;\n                }\n                pagesCache.put(url, page.clone());\n                return Promise.resolve();\n            }\n        default:\n            return Promise.resolve();\n    }\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9ub2RlX21vZHVsZXMvLnBucG0vQHNlcndpc3QrbmV4dEA5LjAuM19uZXh0QDE0LjIuNF9AYmFiZWwrY29yZUA3LjI0LjdfcmVhY3QtZG9tQDE4LjMuMV9yZWFjdEAxOC4zLjFfX3JlYWN0QDE4LjMuX2tjcXd3cmp3NGtwMmJ2aXhlZjJrd3Z6cXdlL25vZGVfbW9kdWxlcy9Ac2Vyd2lzdC9uZXh0L2Rpc3Qvc3ctZW50cnktd29ya2VyLmpzIiwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXMiOlsid2VicGFjazovL19OX0UvLi9ub2RlX21vZHVsZXMvLnBucG0vQHNlcndpc3QrbmV4dEA5LjAuM19uZXh0QDE0LjIuNF9AYmFiZWwrY29yZUA3LjI0LjdfcmVhY3QtZG9tQDE4LjMuMV9yZWFjdEAxOC4zLjFfX3JlYWN0QDE4LjMuX2tjcXd3cmp3NGtwMmJ2aXhlZjJrd3Z6cXdlL25vZGVfbW9kdWxlcy9Ac2Vyd2lzdC9uZXh0L2Rpc3Qvc3ctZW50cnktd29ya2VyLmpzPzdiYmYiXSwic291cmNlc0NvbnRlbnQiOlsic2VsZi5vbm1lc3NhZ2UgPSBhc3luYyAoZXYpPT57XG4gICAgc3dpdGNoKGV2LmRhdGEudHlwZSl7XG4gICAgICAgIGNhc2UgXCJfX1NUQVJUX1VSTF9DQUNIRV9fXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY29uc3QgdXJsID0gZXYuZGF0YS51cmw7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwpO1xuICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2UucmVkaXJlY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGFydFVybENhY2hlID0gYXdhaXQgY2FjaGVzLm9wZW4oXCJzdGFydC11cmxcIik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzdGFydFVybENhY2hlLnB1dCh1cmwsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICBjYXNlIFwiX19GUk9OVEVORF9OQVZfQ0FDSEVfX1wiOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IGV2LmRhdGEudXJsO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhZ2VzQ2FjaGUgPSBhd2FpdCBjYWNoZXMub3BlbihcInBhZ2VzXCIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzUGFnZUNhY2hlZCA9ICEhYXdhaXQgcGFnZXNDYWNoZS5tYXRjaCh1cmwsIHtcbiAgICAgICAgICAgICAgICAgICAgaWdub3JlU2VhcmNoOiB0cnVlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKGlzUGFnZUNhY2hlZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHBhZ2UgPSBhd2FpdCBmZXRjaCh1cmwpO1xuICAgICAgICAgICAgICAgIGlmICghcGFnZS5vaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHBhZ2VzQ2FjaGUucHV0KHVybCwgcGFnZS5jbG9uZSgpKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxufTtcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./node_modules/.pnpm/@serwist+next@9.0.3_next@14.2.4_@babel+core@7.24.7_react-dom@18.3.1_react@18.3.1__react@18.3._kcqwwrjw4kp2bvixef2kwvzqwe/node_modules/@serwist/next/dist/sw-entry-worker.js\n"));

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
/******/ 	__webpack_modules__["./node_modules/.pnpm/@serwist+next@9.0.3_next@14.2.4_@babel+core@7.24.7_react-dom@18.3.1_react@18.3.1__react@18.3._kcqwwrjw4kp2bvixef2kwvzqwe/node_modules/@serwist/next/dist/sw-entry-worker.js"](0, __webpack_exports__, __webpack_require__);
/******/ 	
/******/ })()
;