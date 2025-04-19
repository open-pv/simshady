---
title: How does simshady work?
---

# How does this work

To model the yield of PV systems, simshady takes two major factors into account: weather or climate and local objects that cause shading.

## A scene of 3D geometries

The yield of PV systems placed on a building depends on the shading effects of the building itself, neighboring buildings, vegetation, and nearby mountains. Hence, in simshady, a [`ShadingScene`](/docs/classes/index.ShadingScene.html) is created and populated by adding `three.js` geometries. A main geometry is added using the `addMainGeometry()`. This is the geometry that will be simulated, i.e. the geometry of PV panels or of the building of interest. With `addShadingGeometry()`, geometries are added that are responsible for shading, i.e. buildings or trees from the neighbourhood.

## Weather, Climate, and Skydomes

From [NREL](https://nsrdb.nrel.gov/) we receive time series of measured and modeled GHI and DNI for every location in Germany. In these measured values, the direction of irradiance is not provided, hence we need to model it. We use the [HEALPix](https://doi.org/10.1086/427976) to divide the upper hemisphere into 96 pixels of equal size.

![Figure from Gorski et al.: HEALPix: A framework for high-resolution discretization and fast analysis of data distributed on the sphere](./assets/Gorski2024_Healpix.png)

_Figure 1: HEALPix discretization of spheres, Figure taken from Gorski et al.: "HEALPix: A framework for high-resolution discretization and fast analysis of data distributed on the sphere"_

For every time step of the provided series, we do the following: - We add the Direct Normal Irradiance (short: DNI) to the sky segment where the sun is at the given point in time - We add the difference of Global Horizontal Irradiance (short: GHI) and DNI equally to all sky segments, so that the sum of each of these diffuse contributions multiplied with the sinus of the altitude angle is equal to the diffuse contribution to the GHI.
As a result, a flat surface receives a total irradiance of
`DNI x sin(altitude) + SUM(Diffuse_from_each_segment x sin(altitude))`

## Why `simshady` uses skydomes

There are two reasons for using skydomes: First they allow the simultaneous simulation of direct and diffuse radiation. And second, they allow the simulation of **timely resolved PV yields**. This happens as follows:

1. For each pixel of the sky segment and for each trianlge of the SimulationGeometry, `simshady` runs the Möller-Trumbore algorithm to check if the direct line between sky segment and triangle is intersected by other objects. It saves the value 0 if something intersects, or the value of the dot product of triangle normal vector and the direction vector between triangle and sky segment. This dot product represents the factor of the incident angle of the solar irradiance. The result is an `S x N` vector, where N is the number of trianlges and S the number of sky segment. The vektor represents a shading mask, i.e. every entry is between 0 and 1.
2. In the next step, actual radiance values from the sky dome are integrated. These radiance values can be given in the form of time series, i.e. a vector of shape `S x T` with S being the number of sky segments and T the number of time steps. We can now calculate the incoming energy per time step and per area as

```
E(t,n) = 1/(2xPI) * SUM(Mask(s,n) * irrad(s,t)),
```

where the factor of 2PI comes from integrating over the upper half of the skydome sphere and the unit of E is Wh/m2.

## Performant Simulation on the GPU

The calculations for each triangle of the simulated building are independant of each other, hence the whole simulation can be parallelized. To simulate shading, the Möller-Trumbore algorithm is used, which walks along the line of sight between simulated triangle and the sun and checks if it intersects with other geometries.
We implemented this algorithm in WebGL, so that it can run on the GPU.
