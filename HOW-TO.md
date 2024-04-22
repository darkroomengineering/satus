### Load fonts

Add fonts to load in app/fonts.js

### Debug

Navigate to /debug/orchestra page to see the debug panel.

### Use Lenis

[See documentation](https://github.com/darkroomengineering/lenis/blob/main/packages/react/README.md)

### Add WebGL

- Add `<Canvas>` in the app to add a WebGL canvas, it will be fixed within your page behind the DOM elements.
- Use <WebGLTunnel.In> when you want to add a r3f component to the canvas.

```jsx
<WebGLTunnel.In>
  <mesh>
    <boxBufferGeometry />
    <meshNormalMaterial />
  </mesh>
</WebGLTunnel.In>
```
