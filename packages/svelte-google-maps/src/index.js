// Assume ES Modules usage is with svelte compiler
// so import components separately to avoid bundling unneeded code
//
// Example:
//
// import { Context } from 'svelte-google-maps';
// import Map from 'svelte-google-maps/Map.html';
// import Marker from 'svelte-google-maps/Marker.html';

export { default as Context } from './context';
