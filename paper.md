---
title: '@openpv/simshady: A Javascript Package for Photovoltaic Yield Estimation Based on 3D Meshes'
tags:
  - TypeScript
  - JavaScript
  - energy
  - solar
  - photovoltaic
  - energy system
authors:
  - name: Florian Kotthoff
    orcid: 0000-0003-3666-6122
    corresponding: true
    affiliation: '1,2' # (Multiple affiliations must be quoted)
  - name: Konrad Heidler
    orcid: 0000-0001-8226-0727
    corresponding: false
    affiliation: 1 # (Multiple affiliations must be quoted)
  - name: Martin Großhauser
    orcid: 0000-0003-2637-3828
    corresponding: false
    affiliation: 1 # (Multiple affiliations must be quoted)
  - name: Korbinian Pöppel
    orcid: 0009-0002-4734-1040
    corresponding: false
    affiliation: 1 # (Multiple affiliations must be quoted)
affiliations:
  - name: OpenPV GbR, ADRESS
    index: 1
  - name: OFFIS Institute for Information Technology, Escherweg 2, 26121 Oldenburg, Germany
    index: 2

date: 01 November 2024
bibliography: paper.bib
#This paper compiles with the following command: docker run --rm --volume .:/data --user $(id -u):$(id -g) --env JOURNAL=joss openjournals/inara
---

# Summary

`simshady` is a JavaScript package for simulating photovoltaic (PV) energy yields. It can integrate local climate data and 3D object shading. It utilizes three.js meshes for geometric modeling and performs shading analysis using a WebGL-parallelized implementation of the Möller-Trumbore intersection algorithm. The output includes color-coded three.js meshes representing the expected PV yield.

# Statement of need

To meet global climate targets, solar photovoltaic (PV) capacity must expand significantly. Tripling renewable energy capacity by 2030 is essential to limit global warming to 1.5°C [@IEA2023]. The expansion of PV plays a crucial part, and PV systems offer another benefit. Small scale house mounted PV systems enable the public participation and legitimize the energy transition.
For calculating the yield of PV systems, various factors are important: the location of the planned installation, the local climate, surrounding objects such as houses or trees, and the terrain. To provide accurate estimates of expected yields, simulation tools are essential in both research and practical PV system planning.
For these reasons, a variety of software tools already exist [@holmgren2018review; @jakica2018state]. One videly used software is the python package pvlib [@anderson2023pvlib]. It offers a variety of functionalities around the modeling of PV systems. However, the rather niche topic of shading simulation with 3D objects is not included in this package. Another python based software that enables irradiance modelling in two dimensions is `pvfactors` [@pvfactors2025; @anoma_view_2017].
Regarding web based tools, solutions like PVGIS, PVWatts and RETScreen exist [@psomopoulos2015comparative]. Their focus lies on estimates based on geographic location and user information of building geometries. They do not offer shading simulations based on 3D geometries.
The `@openpv/simshady` package targets the gap of javascript based software, that can be run on the server using node or in the browser that implements the raytracing on the GPU.

# Package description

The javascript package `@openpv/simshady` orients at the functionalities of three.js and first initializes a scene object. Various adder functions can then be used to add relevant data to this scene:

- The core simulation geometry as the object where the PV yield is of interest. This is usually a geometry of a house. This geomety needs to be a vector mesh. It is not optional.
- The background geometries as geometries that are relevant for shading, but where no PV yield should be calculated. These geometries are usually the houses from the neighborhood or trees. These geometries need to be vector meshes. They are optional.
- A height map can be added to account for the impact of shading from mountains or hills. This heightmap needs to be rasterized.
- Sun irradiance data is needed in the format of sky domes, which are essentially a list of [altitude, azimuth, irradiance] values.

If all relevant data is added to the scene object, the simulation can be started. Since the physical simulation of solar rays can be parallelized, this simulation is implemented in WebGL. By that, the GPU can be utilized, which results in a much stronger performance.

# Conclusion

# CRediT Authorship Statement

FK:
MG:
KH:
KP:

# Acknowledgements

The authors acknowledge support by ... (how do we name Prototypefund here?)

# References
