---
title: Getting Started
---

# Getting Started

> 💡 A minimal example App using 'simshady' can be found [here](https://github.com/open-pv/minimalApp).

## Installation

Install the package using your preferred package manager:

```bash
npm install @openpv/simshady
```

## Basic Usage

### **1. Initialize the Scene**

Begin by creating a new [`ShadingScene`](/simshady/classes/index.ShadingScene.html) object:

```javascript
import ShadingScene from '@openpv/simshady';

const scene = new ShadingScene();
```

<br/>
<br/>

### **2. Add Geometries**

Add one or more simulation geometries — such as buildings or PV panels — using [`addSimulationGeometry`](/simshady/classes/index.ShadingScene.html#addsimulationgeometry). Add shading geometries using [`addShadingGeometry`](/simshady/classes/index.ShadingScene.html#addshadinggeometry):

```javascript
scene.addShadingGeometry(someShadingGeometry);
scene.addSimulationGeometry(someSimulationGeometry);
```

In _Figure 1_, the difference between the two types of geometries is shown. The simulation geometry, represented by the colored building, is the main focus where PV yield is calculated. The shading geometries, shown in grey-brown, are included in the simulation to account for shading effects due to their close proximity.

![Screenshot from openpv.de showing simulation and shading geometries](assets/screenshot-simulation-geometry.jpg)

_Figure 1: Screenshot from openpv.de showing both simulation geometries (colored) and shading geometries (grey-brown)._

These geometries need to be [Three.js Buffer Geometries](https://threejs.org/docs/#api/en/core/BufferGeometry). You can use a variety of [Three.js Loaders](https://threejs.org/manual/#en/loading-3d-models) to load different 3D file formats to BufferGeometries.
<br/>
<br/>

### **3. Add Solar Irradiance Data**

Include irradiance data in the [required format](/simshady/types/utils.SolarIrradianceData.html) via [`addSolarIrradiance`](/simshady/classes/index.ShadingScene.html#addsolarirradiance). This data should contain time series for both direct and diffuse irradiance:

```javascript
scene.addSolarIrradiance(someSolarIrradianceData);
```

<br/>
<br/>

### **4. Run the Simulation**

Call the [`calculate`](/simshady/classes/index.ShadingScene.html#calculate) method to perform the simulation. It returns a [Three.js Mesh](https://threejs.org/docs/#api/en/objects/Mesh), which can be used directly in a Three.js scene:

```javascript
let mesh = await scene.calculate({
  solarToElectricityConversionEfficiency: 0.15,
});

showThreeJS(mesh);
```

<br/>
<br/>
> 💡 You can see simshady in action at [openpv.de](https://openpv.de).
