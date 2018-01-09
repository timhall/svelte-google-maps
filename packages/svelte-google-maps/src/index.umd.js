// Assume UMD usage is in browser so include everything
//
// Example:
//
// <script src="https://unpkg.com/svelte-google-maps"></script>
// <script>
//   const { Context, Map, Marker } = SvelteGoogleMaps;
// </script>

export { default as Context } from './context';
export { default as Map } from '../Map.html';
export { default as Marker } from '../Marker.html';
export { default as Polyline } from '../Polyline.html';
export { default as Info } from '../Info.html';
export { default as Overlay } from '../Overlay.html';
