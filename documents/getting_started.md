---
title: Getting Started
---
# Getting started


The basic usage of the package works as follows:

```javascript
import ShadingScene from '@openpv/simshady';

const lat = 50.0;
const lon = 11.0;
const scene = new ShadingScene(lat, lon);
scene.addShadingGeometry(someShadingGeometry);
scene.addSimulationGeometry(someSimulationGeometry);
scene.addSolarIrradiance(someSolarIrradianceData)

let mesh = await scene.calculate({
    pvCellEfficiency: 0.16
});

showThreeJS(mesh);
```

