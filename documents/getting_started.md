---
title: Getting Started
---
# Getting started


The basic usage of the package works as follows: First, a `ShadingScene`](/docs/classes/index.ShadingScene.html) is initialized.

```javascript
import ShadingScene from '@openpv/simshady';
const scene = new ShadingScene();
```
Then, geometries are added to the scene. One or multiple geometries as SimulationGeometries - these are the geometries of the object that will be simulated, like a house or a PV panel. Moreover, ShadingGeometries are added that are taken for shading in the scene.
```javascript
scene.addShadingGeometry(someShadingGeometry);
scene.addSimulationGeometry(someSimulationGeometry);
```
As a third step, solar irradiance data is added to the scene. This data contains time series data on direct and diffuse irradiance.

```javascript
scene.addSolarIrradiance(someSolarIrradianceData)
let mesh = await scene.calculate({
    pvCellEfficiency: 0.16
});
```

```javascript
showThreeJS(mesh);
```



