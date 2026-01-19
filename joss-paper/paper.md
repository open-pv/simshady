---
title: 'openpv/simshady: A Javascript Package for Photovoltaic Yield Estimation Based on 3D Meshes'
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
    affiliation: 1
  - name: Martin Großhauser
    orcid: 0000-0003-2637-3828
    corresponding: false
    affiliation: 1
  - name: Mino Estrella
    orcid: 0009-0009-7372-4548
    corresponding: false
    affiliation: 3
  - name: Korbinian Pöppel
    orcid: 0009-0002-4734-1040
    corresponding: false
    affiliation: 1
affiliations:
  - name: OpenPV GbR, Munich, Germany
    index: 1
  - name: OFFIS Institute for Information Technology, Escherweg 2, 26121 Oldenburg, Germany
    index: 2
  - name: Chair of Renewable and Sustainable Energy Systems, Technical University of Munich, Germany
    index: 3

date: 01 November 2024
bibliography: paper.bib
#This paper compiles with the following command: docker run --rm --volume .:/data --user $(id -u):$(id -g) --env JOURNAL=joss openjournals/inara
---

# Summary

openpv/simshady is a JavaScript package for simulating photovoltaic (PV) energy yields. It integrates local climate data and 3D objects into its shading simulation, utilizing Three.js meshes for geometric modeling. The package performs shading analysis using a WebGL-parallelized implementation of the Möller-Trumbore intersection algorithm [@Möller01011997], producing color-coded Three.js meshes that represent the expected PV yield. Simshady provides both a package for web development, as well as a Command-line interface (CLI) tool for simulations on your machine.

# Statement of need

To meet global climate targets, solar photovoltaic (PV) capacity must expand significantly. Tripling renewable energy capacity by 2030 is essential to limit global warming to 1.5°C [@IEA2023]. The expansion of PV plays a crucial role, and PV systems offer an additional benefit: small-scale house-mounted PV systems enable public participation and legitimize the energy transition.

For calculating the yield of PV systems, various factors are important, including the location of the planned installation, local climate, surrounding objects such as houses or trees, and terrain. To provide accurate estimates of expected yields, simulation tools are essential in both research and practical PV system planning.

For these reasons, a variety of software tools for simulating photovoltaic systems already exist [@holmgren2018review; @jakica2018state]. One widely used software is the Python package pvlib [@anderson2023pvlib], which offers a range of functionalities. However, the rather niche topic of shading simulation with 3D objects is not included in this package. Another Python-based software that enables irradiance modeling in two dimensions is pvfactors [@pvfactors2025; @anoma_view_2017].

Web-based tools for solar panel simulations, such as PVGIS, PVWatts, and RETScreen, provide an accessible means for non-technical individuals to estimate energy yields based on geographic location and building geometry [@psomopoulos2015comparative]. However, these tools lack the capability to perform shading simulations using 3D geometries.

# Software design

`openpv/simshady` simulates the yield of photovoltaic (PV) systems by considering weather/climate data and shading from local 3D geometry. It is build around three core principles: (1) To run the core simulation code efficiently on the GPU, (2) to expose two different interfaces for both browser-based applications and server-based simulation, and (3) to integrate standardized data models, namely from `Three.js` and from the Wavefront OBJ file format.

In simshady, a 3D scene is built that represents the environment, comprising primary objects for simulation (e.g., PV panels or target buildings) and surrounding objects that may cast shadows (e.g., neighboring buildings, trees). Weather and climate data are integrated using Global Horizontal Irradiance (GHI) and Direct Normal Irradiance (DNI) datasets, which are reconstructed to include directional irradiance information using the HEALPix framework [@Górski_2005; @zonca2019healpy].

The simulation utilizes the Möller-Trumbore intersection algorithm [@Möller01011997] to determine if any shading objects obstruct the view between a sky pixel and the main simulation geometry. For each triangle in the simulation geometry, a shading mask is generated, indicating whether an object blocks the line of sight from the sky pixel to the triangle. The shading mask values range from 0 to 1, where 0 indicates that an object shades the triangle, 1 signifies that there is no obstruction and the line of sight is perpendicular to the triangle, and values between 0 and 1 represent cases where there is no obstruction but the angle of incidence is not perpendicular. The aggregated radiance values from all sky dome pixels are then multiplied by the corresponding shading mask values and summed to calculate the total energy received by each triangle. This computation is fully parallelizable and has been implemented using WebGL, allowing for GPU acceleration.

## Simshady in the browser

Simshady reuses the data model and objects of `Three.js`, a common package for 3D web applications. The package processes `Three.js` meshes and adds the simulated PV yield as a color to the mesh, as shown in \autoref{fig:threejs-mesh}. Additionally, each triangle of the simulated buildings has its solar yield assigned as an attribute for further processing.

![A simulated building with its solar yield, where dark purple represents low yields and light yellow represents high yields. The simulated shading from neighboring buildings is visualized through darker colors. Screenshot taken from [@openpv] \label{fig:threejs-mesh}](screenshot-simulation-geometry.jpg){ width=90% }

## Simshady in the terminal

The `simshady` CLI is a wrapper around the core WebGL‑based simulation engine that enables batch processing of photovoltaic‑yield analyses on a server. It first parses a small set of required arguments (the simulation geometry and the irradiance data). The supplied geometry files, either JSON objects or Wavefront OBJ files, are handed to a headless Chromium instance launched via Puppeteer [@puppeteer].

Inside the browser context the full simshady package is injected, the scene is reconstructed, and the GPU‑accelerated Möller‑Trumbore ray‑tracing routine is executed. When the calculation finishes, the CLI extracts the mesh data from the browser, writes binary artefacts (positions.bin, colors.bin, intensities.bin), a colour‑coded OBJ file, a top‑down snapshot, and the simulation results into the user‑specified output directory.

# Research impact statement

- First open source, free software of its kind
- Multi usage approach: Server and Client

# Conclusion

The `openpv/simshady` package serves two primary purposes: it provides a solution for scientific calculations of PV yield, while also facilitating science communication through interactive and user-friendly simulations. This eliminates the need for specialized software or programming knowledge, making it accessible to a broader range of users. Furthermore, by implementing the main algorithm in WebGL, the package achieves higher performance than a pure Javascript implementation, and it offers a JavaScript wrapper around PV simulation in WebGL. This is particularly beneficial because WebGL is a language that is not widely known among scientists, and thus can be challenging for them to implement their own code, making the `openpv/simshady` package a valuable tool for simplifying this process.

# Credit Authorship Statement

FK: Conceptualization, Software, Funding acquisition, Writing – original draft

MG: Conceptualization, Software, Funding acquisition, Writing – review & editing

KH: Conceptualization, Software, Funding acquisition, Writing – review & editing

ME: Software, Writing – review & editing

KP: Conceptualization, Software, Funding acquisition, Writing – review & editing

# AI usage disclosure

After designing the software architecture and writing core functionalities, both open-weight and properitarian LLM-based chatbots where used to implement or debug some of the methods in simshady. Generative agentic AI tools that can write and edit code autonomously were not used. The open-weight models gpt-oss:120b and deepseek-r1:70b were used for reviewing the written text of this paper.

# Acknowledgements

The development of this software was funded by the German Federal Ministry of Research, Technology and Space within the "Software Sprint - Support for Open Source Developers" program by Prototype Fund.

# References
