---
title: 'simshady: A Typescript Package for Photovoltaic Yield Estimation Based on 3D Meshes'
tags:
  - typescript
  - energy
  - solar
  - photovoltaic
  - energy system
authors:
  - name: Florian Kotthoff
    orcid: 0000-0003-3666-6122
    corresponding: true # (This is how to denote the corresponding author)
    affiliation: 1 # (Multiple affiliations must be quoted)
affiliations:
  - name: OpenPV GbR, ADRESS
    index: 1

date: 01 November 2024
bibliography: paper.bib
#This paper compiles with the following command: docker run --rm --volume $PWD/paper:/data --user $(id -u):$(id -g) --env JOURNAL=joss openjournals/inara
#Here $PWD/paper is the folder where the paper.md file lies
---

# Summary

- shading simulation based on three.js meshes
- pv yield estimation

# Statement of need

- pv expansion needed to reach climate goals
- modelling pv yield and earnings is important
- 

# Package description
The javascript package `simshady` first initializes a scene object. Various adder functions can then be used to add relevant data to this scene: 
* The core simulation geometry as the object where the PV yield is of interest. This is usually a geometry of a house. This geomety needs to be a vector mesh. It is not optional.
* The background geometries as geometries that are relevant for shading, but where no PV yield should be calculated. These geometries are usually the houses from the neighborhood or trees. These geometries need to be vector meshes. They are optional.
* A height map can be added to account for the impact of shading from mountains or hills. This heightmap needs to be rasterized.
* Sun irradiance data is needed in the format of sky domes, which are essentially a list of [altitude, azimuth, irradiance] values.

If all relevant data is added to the scene object, the simulation can be started. Since the physical simulation of solar rays can be parallelized, this simulation is implemented in WebGL. By that, the GPU can be utilized, which results in a much stronger performance.
# Conclusion

# CRediT Authorship Statement

FK:

# Acknowledgements

The authors acknowledge support by ... (how do we name Prototypefund here?)

# References
