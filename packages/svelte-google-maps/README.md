# svelte-google-maps

## Map

Create a map instance that child components like `Marker`, `Info`, and `Overlay` can be added to for rich, interactive maps.
`center` and `zoom` can be data-bound and the `map` context is used to connect child components together. 

```html
<Map :map bind:center zoom=11 />
<p>Center: {{center}}</p>

<script>
  import { Context } from 'svelte-google-maps'; 
  import Map from 'svelte-google-maps/Map.html';

  export default {
    components: { Map },
    data() {
      return {
        map: new Context('your-api-key'),
        center: { lat: 37.540725, lng: -77.436048 }
      }
    }
  }
</script>
```

## Marker

Traditional Google Maps marker, with options for `title`, `label`, and/or `icon`.

```html
<Map :map :center :zoom>
  <Marker :map :position />
  <Marker :map :position title="..." />
  <Marker :map :position label="A" />
  <Marker :map :position icon="..." />
</Map>

<script>
  import { Context } from 'svelte-google-maps';
  import Map from 'svelte-google-maps/Map.html';
  import Marker from 'svelte-google-maps/Marker.html';

  export default {
    components: { Map, Marker },
    data() {
      return {
        map: new Context('your-api-key'),
        center: { lat: 37.540725, lng: -77.436048 },
        zoom: 11,

        position: { lat: 37.540725, lng: -77.436048 }
      };
    }
  }
</script>
```

## Info

Use Google Maps' built-in `InfoWindow` to show an info bubble with information.
The info bubble is shown when the component is added, so wrap it an `{{#if}}` to display it as-needed.

```html
<Map :map :center :zoom>
  <Marker :map :position on:click="set({ details: 'Howdy!' })" />
  
  {{#if details}}
    <Info :map :position on:close="set({ details: null })">{{ details }}</Info>
  {{/if}}
</Map>

<script>
  import { Context } from 'svelte-google-maps';
  import Map from 'svelte-google-maps/Map.html';
  import Marker from 'svelte-google-maps/Marker.html';
  import Info from 'svelte-google-maps/Info.html';

  export default {
    components: { Map, Marker, Info },
    data() {
      return {
        map: new Context('your-api-key'),
        center: { lat: 37.540725, lng: -77.436048 },
        zoom: 11,

        position: { lat: 37.540725, lng: -77.436048 },
        details: null
      };
    }
  }
</script>
```

## Overlay

Display any content, overlaid on the map. `position` is used to place the top-left corner or the content.
Optionally, an `offset` can be passed to adjust the positioning.

```html
<Map :map :center :zoom>
  <Overlay :map :position>
    Custom Content
  </Overlay>
</Map>

<script>
  import { Context } from 'svelte-google-maps';
  import Map from 'svelte-google-maps/Map.html';
  import Overlay from 'svelte-google-maps/Overlay.html';

  export default {
    components: { Map, Overlay },
    data() {
      return {
        map: new Context('your-api-key'),
        center: { lat: 37.540725, lng: -77.436048 },
        zoom: 11,
        position: { lat: 37.540725, lng: -77.436048 }
      };
    }
  }
</script>
```

## Polyline

```html
<Map :map :center :zoom>
  <Polyline :map :path color="red" />
</Map>

<script>
  import { Context } from 'svelte-google-maps';
  import Map from 'svelte-google-maps/Map.html';
  import Polyline from 'svelte-google-maps/Polyline.html';

  export default {
    components: { Map, Overlay },
    data() {
      return {
        map: new Context('your-api-key'),
        center: { lat: 37.540725, lng: -77.436048 },
        zoom: 11,
        path: [{ lat: 37.540725, lng: -77.436048 }/*, { lat, lng}... */]
      };
    }
  }
</script>
```

## Context

`Context` is used to create a map instance that is shared between `Map`, `Marker`, and other map components.

```html
<Map :map />

<script>
  import { Context } from 'svelte-google-maps';

  const API_KEY = 'your-api-key';

  export default {
    data() {
      return {
        map: new Context(API_KEY)
      }
    }
  }
</script>
```
