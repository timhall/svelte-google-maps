# svelte-google-maps

## Map

```html
<Map :map :center zoom=11 />

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

```html
<Map :map :center :zoom>
  <Marker :map />
  <Marker :map title="..." />
  <Marker :map label="A" />
  <Marker :map icon="..." />
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
        zoom: 11
      };
    }
  }
</script>
```

## Overlay

More details coming soon.

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
