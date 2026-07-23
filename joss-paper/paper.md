---
title: 'openpv/simshady: A JavaScript Package for Photovoltaic Yield Estimation Based on 3D Meshes'
tags:
  - TypeScript
  - JavaScript
  - Energy
  - Solar
  - Photovoltaic
  - Shading Simulation
  - Energy System
authors:
  - name: Florian Kotthoff
    orcid: 0000-0003-3666-6122
    corresponding: true
    affiliation: '1,2,3' # (Multiple affiliations must be quoted)
  - name: Mino Estrella
    orcid: 0009-0009-7372-4548
    corresponding: false
    affiliation: 3
  - name: Martin Großhauser
    orcid: 0000-0003-2637-3828
    corresponding: false
    affiliation: 1
  - name: Konrad Heidler
    orcid: 0000-0001-8226-0727
    corresponding: false
    affiliation: 1
  - name: Korbinian Pöppel
    orcid: 0009-0002-4734-1040
    corresponding: false
    affiliation: 1
affiliations:
  - name: OpenPV GbR, Munich, Germany
    index: 1
  - name: OFFIS Institute for Information Technology, 26121 Oldenburg, Germany
    index: 2
  - name: Chair of Renewable and Sustainable Energy Systems, Technical University of Munich, 85748 Munich, Germany
    index: 3

date: 11 March 2026
bibliography: paper.bib
#This paper compiles with the following command: docker run --rm --volume .:/data --user $(id -u):$(id -g) --env JOURNAL=joss openjournals/inara
---

# Summary

openpv/simshady (short: `simshady`) is a JavaScript package for simulating photovoltaic (PV) energy yields. It integrates local climate data and 3D objects into its shading simulation, utilizing Three.js meshes for geometric modeling. The package performs shading analysis using a WebGL-parallelized implementation of the Möller-Trumbore intersection algorithm [@Möller01011997]. With the software, users can obtain both aggregated and spatial or temporally resolved simulated scenes of expected PV yields for further processing. `simshady` provides both a package for web development, as well as a Command-line interface (CLI) tool for running simulations locally.

# Statement of need

To meet global climate targets, solar photovoltaic (PV) capacity must expand significantly. Tripling renewable energy capacity by 2030 is essential to limit global warming to 1.5°C [@IEA2023]. The expansion of PV plays a crucial role, and PV systems offer an additional benefit: small-scale house-mounted PV systems enable public participation and legitimize the energy transition. For calculating the yield of PV systems, various factors are important, including the location of the planned installation, local climate, surrounding objects such as houses or trees, and terrain. To provide accurate estimates of expected yields, simulation tools are essential in both research and practical PV system planning. For these reasons, a variety of software tools for simulating photovoltaic systems already exist [@holmgren2018review; @jakica2018state; @KUMARVASHISHTHA20221450].

`simshady` fills a gap in the area of detailed 3D shading simulation for PV yield estimation. This is especially important when modeling PV systems in real environments outside the laboratory, because shading caused by nearby objects, terrain, or other panels significantly lowers the yield of PV systems. Accurate shading simulation is therefore essential for real-world yield estimation.

# State of the field

Existing software can roughly be grouped into three groups: full-suite commercial design tools, simplified yield calculators, and developer libraries.

Full-suite design tools target professional PV planners and combine 3D system modeling, component databases and financial analysis behind a graphical user interface. HelioScope by Aurora Solar is a web-based design platform that approximates near shading by projecting drop shadows from 3D objects rather than performing full ray tracing, and is offered as a paid subscription [@helioscope2026]. PV\*SOL premium by Valentin Software is a Windows desktop application that performs detailed sub-module shading analysis at cell level, but is restricted to interactive single-project use, meaning it requires manual, GUI-based operation for one project at a time without automation or batch processing capabilities [@pvsol2026]. PVsyst is the industry reference for bankable yield reports and additionally provides a separately licensed command-line tool, PVsystCLI, which is the only existing software that combines accurate 3D near shading with batch automation, but at a cost of several thousand Swiss francs per year [@pvsyst2026]. The System Advisor Model (SAM) developed by the National Laboratory of the Rockies (NLR) is open source and exposes a Python wrapper (PySAM), but its 3D shading capabilities are limited compared to dedicated design tools [@sam2026]. Within the ecosystem of the open-source geoinformation software QGIS, the Urban Multi-scale Universal Predictor (UMEP) [@LINDBERG201870] plugin contains a tool for shading simulations on 2D digital surface models [@LINDBERG2015369] called SEBE (short for: Solar Energy on Building Envelopes).

Among the developer libraries, the Python package pvlib [@holmgren2018pvlib; @anderson2023pvlib] offers a large range of functionalities. With pvlib it is possible to model shading scenarios where the whole 3D scene is not needed. Examples are the possibility to model horizon shading from far-away objects like hills, or modeling diffusive self-shading or partial module shading, to name a few. However, the topic of shading simulation with 3D objects is not included in this package. Another Python-based software that enables irradiance modeling in two dimensions is pvfactors [@anoma_view_2017], which computes view factors between PV rows and the ground to capture row-to-row and bifacial shading, but cannot represent arbitrary 3D obstacles such as trees or buildings. SoDeLe wraps pvlib in an end-user GUI for quick residential estimates and likewise omits 3D shading [@sodele2026]. Web-based tools for solar panel simulations, such as PVGIS, PVWatts, and RETScreen, provide an accessible means for non-technical individuals to estimate energy yields based on geographic location and building geometry [@psomopoulos2015comparative]. These tools account for far-shading from the horizon or terrain, or for self-shading derived from the ground coverage ratio, but lack the capability to perform shading simulations using 3D geometries from nearby objects. RADIANCE [@RADIANCE] is a collection of tools designed for general light and shading simulation and developed in the 1990s. For solar simulation, the bifacial_radiance tool [@Ayala_Pelaez2020] exists as a Python wrapper around the original Software. In combination, these software packages offer a variety of shading methods, including detailed shading simulation in 3D. Table \ref{tab:tool-comparison} summarises the tools by the capabilities most relevant to urban-scale PV assessment.

: Comparison of representative PV simulation tools by the capabilities most relevant to automated, city-scale assessment. In the shading column, 3D means that 3-dimensional objects are used to model shading, 3D (simplified) means a 3D scene is used but objects are abstracted as polygons, DSM means that Digital Surface Models (height maps) are used, 2D means that the simulation only relies on 2D abstractions, Horizon represents shading through the horizon contour, Row represents row-to-row self-shading without 3D objects, Diffuse represents reduction of diffuse irradiance due to the array geometry, and None means no shading modeling is provided. \label{tab:tool-comparison}

| Tool              | Platform | Cost | Open Source | Shading               | Source                                   |
| ----------------- | -------- | ---- | ----------- | --------------------- | ---------------------------------------- |
| HelioScope        | Web      | Paid | No          | 3D                    | [@helioscope2026]                        |
| PV\*SOL prem.     | Desktop  | Paid | No          | 3D                    | [@pvsol2026]                             |
| PVsyst            | Desktop  | Paid | No          | 3D                    | [@pvsyst2026]                            |
| bifacial_radiance | Package  | Free | Yes         | 3D                    | [@Ayala_Pelaez2020]                      |
| SAM               | Desktop  | Free | Yes         | 3D simplified         | [@sam2026]                               |
| QGIS Plugin SEBE  | Desktop  | Free | Yes         | DSM                   | [@LINDBERG2015369]                       |
| PVGIS             | Web      | Free | No          | Horizon               | [@pvgis2026]                             |
| PVWatts           | Web      | Free | Yes         | Row                   | [@pvwatts2026]                           |
| SoDeLe            | Package  | Free | Yes         | None                  | [@sodele2026]                            |
| pvlib             | Package  | Free | Yes         | Horizon, Row, Diffuse | [@holmgren2018pvlib; @anderson2023pvlib] |
| pvfactors         | Package  | Free | Yes         | 2D                    | [@anoma_view_2017]                       |

# Software design

`simshady` simulates the yield of photovoltaic (PV) systems by considering weather/climate data and shading from local 3D geometry. It is built around three core principles: (1) To run the core simulation code efficiently on the GPU, (2) to expose two different interfaces for both browser-based applications and server-based simulation, and (3) to integrate standardized data models, namely from `Three.js` and from the Wavefront OBJ file format.

## Input data

In `simshady`, two major types of input data need to be provided. First, a 3D scene is built that represents the environment, consisting of primary objects for simulation (e.g., PV panels or target buildings) and surrounding objects that may cast shadows (e.g., neighboring buildings, trees). These objects can be provided as Wavefront .obj files or as Three.js geometries. Second, weather and climate data need to be provided as input data in .json format by aggregating irradiance data such as Global Horizontal Irradiance (GHI) and Direct Normal Irradiance (DNI) datasets onto sky domes, for example by assigning irradiance values to each sky segment [@Górski_2005; @zonca2019healpy].

## Simulation pipeline

The central `ShadingScene` class orchestrates the simulation through the following steps:

1. **Geometry pre-processing:** First, the simulation mesh is refined by recursively subdividing triangles whose longest edge exceeds a configurable threshold (default 1.0 m), ensuring a uniform spatial resolution for the PV yield calculation. Reducing this threshold results in a larger number of smaller triangles in the mesh, and therefore a higher resolution of the simulated shading. To improve the simulation speed, a geometry filter removes shading triangles that cannot cast shadows on the simulation geometry given the minimum solar altitude angle present in the irradiance dataset.

2. **Ray tracing:** The simulation utilizes the Möller-Trumbore intersection algorithm [@Möller01011997] to determine if any shading objects obstruct the view between a sky segment and the main simulation geometry (See \autoref{fig:skydome-openpv} a). For each triangle in the simulation geometry, a shading mask is generated, indicating whether an object blocks the incident irradiance beam from the sky dome surface to the triangle. The shading mask values range from 0 to 1, where 0 indicates that an object shades the triangle, 1 signifies that there is no obstruction and the line of sight is perpendicular to the triangle, and values between 0 and 1 represent cases where there is no obstruction but the angle of incidence is not perpendicular.

3. **Irradiance integration and yield calculation:** The irradiance values from all sky segments are needed as input data. They represent the irradiance in W/m² that reaches the simulation geometry from a given sky segment. They are multiplied by their corresponding shading mask values and summed to obtain the total irradiance received by each triangle. The resulting intensities are converted to electrical yield (in kWh/m²) using a configurable solar-to-electricity conversion efficiency (default 15%). This efficiency includes the PV panel efficiency as well as the ratio of total area and area covered by PV panels.

4. **Visualization:** The computed yield values are normalized and mapped to RGB colors using a configurable colormap (See \autoref{fig:skydome-openpv} b). The resulting mesh carries both the color attribute for visualization and per-triangle solar yield for further analysis.

![a) Schema of the simulation setup: For each surface of the sky dome and for each triangle of the simulation geometry, it is simulated if an object blocks the incoming irradiance. b) A simulated building with its yearly averaged solar yield, where dark purple represents low yields and light yellow represents high yields. Screenshot taken from [@openpv]. \label{fig:skydome-openpv}](combinedFigure-skydome-openpv.png){ width=90% }

## Simshady in the browser

`simshady` reuses the data model and objects of `Three.js`, a common package for 3D web applications. The package processes `Three.js` meshes and adds the simulated PV yield as a color to the mesh, as shown in \autoref{fig:skydome-openpv} b). Additionally, each triangle of the simulated buildings has its solar yield assigned as an attribute for further processing.

## Simshady in the terminal

The `simshady` CLI is a wrapper around the core WebGL‑based simulation engine that enables batch processing of photovoltaic‑yield analyses on a server. It first parses a small set of required arguments (the simulation geometry and the irradiance data). The supplied geometry files, either JSON objects or Wavefront OBJ files, are handed to a headless Chromium instance launched via Puppeteer [@puppeteer].

Inside the browser context the full `simshady` package is injected, the scene is reconstructed, and the GPU‑accelerated Möller‑Trumbore ray‑tracing routine is executed. When the calculation finishes, the CLI extracts the mesh data from the browser and writes the following artefacts into the user‑specified output directory: binary files for vertex positions, colors, and intensities; a color‑coded Wavefront OBJ file with per-vertex RGB values; an orthographic top‑down PNG snapshot of the scene; and a JSON summary containing per-timestep and total aggregated yield statistics such as total and mean yield or surface area.

# Research impact statement

Compared to the state of the field, `simshady` now fills two existing gaps: First, it is implemented in TypeScript and hence simultaneously enables simulations in the browser and on a local machine. Second, it tackles the calculation intensive task of raytracing for shading simulation with a performant WebGL implementation on the GPU. The shader language GLSL (OpenGL Shading Language), on which WebGL is built, is not familiar for most developers: it only ranks 35th among programming languages on GitHub [@GitHub2026Innovation]. Hence, `simshady` makes the parallelized simulation of shading more accessible by exposing the WebGL simulation code through the more familiar JavaScript APIs instead.

## City-scale demonstration: Munich

One existing demonstration of the research impact was the application of the `simshady` CLI to simulate the PV yield for the entire city of Munich. The original data consists of 109 CityGML LoD2 tiles. Each tile had a size of 2x2 km². For processing, each tile was split into four tiles, one square kilometre each. The 3D data contained roughly 200 km² of building surface in total. Averaged incoming irradiance in W/m² per steradian was derived from the National Solar Radiation Database [@sengupta2018national] and projected onto a HEALPix skydome. The skydomes together with the 3D geometries were then used for the ray-tracing simulation. \autoref{fig:combinedMunich} a) shows one 3D mesh output for one tile. All tiles combined generate a simulation scene of the whole city of Munich, which is depicted in b) \autoref{fig:combinedMunich} as an orthographic top-down image.

![a) 3D mesh output of the CLI for a single Munich tile, with per-triangle annual PV yield mapped onto the building geometry (dark blue = low, light yellow = high). b) Orthographic top-down snapshots generated by the CLI for all Munich tiles, combined in one image. \label{fig:combinedMunich}](combinedFigure.png){ width=80% }

The complete simulation took roughly 110 hours on a single cloud GPU server running four parallel CLI instances and cost less than 60 USD. The full output, including geometry, intensities, metadata and visualization artefacts for all tiles, makes up roughly 35 GB in compressed format and is openly available as a dataset on Zenodo under CC BY 4.0 [@simshady_munich_dataset].

# Conclusion

The `simshady` package serves two primary purposes: it provides a solution for scientific calculations of PV yield on local machines through the CLI, while also facilitating science communication through interactive web-based simulations. The second one eliminates the need for specialized software or programming knowledge, making it accessible to a broader range of users.

Two design decisions are especially relevant: By implementing the main algorithm in WebGL, the package achieves higher performance than a pure JavaScript implementation, and it offers a JavaScript wrapper around PV simulations in WebGL. Additionally, `simshady` simplifies the simulation workflow by processing standardized input formats, thereby simplifying its integration in existing workflows.

In the future, `simshady` can profit from various developments: First, the architectural decision of outsourcing the calculation of irradiance has a clear benefit. If averaged irradiance data are provided for a whole year, `simshady` calculates the averaged PV yield per year. If irradiance time series data are provided, `simshady` can also simulate time series of PV yield that show the local shading influence at highly resolved times. However, with this benefit comes the disadvantage that users need to provide irradiance data themselves. One useful extension would be to integrate the creation of these time series into the software.

Second, the interoperability with existing standards is started in `simshady`, but not finished. Processing three.js objects or .obj files is already nice, but providing results in formats that can be reused in other software tools, like `pvlib` for example, would also be beneficial for the whole community.

To extend and maintain `simshady` in the future, other researchers and developers are warmly welcome to contribute to the codebase or discuss new ideas within the issue section.

# Credit Authorship Statement

FK: Conceptualization, Software, Funding acquisition, Writing – original draft

MG: Conceptualization, Software, Funding acquisition, Writing – review & editing

KH: Conceptualization, Software, Funding acquisition, Writing – review & editing

ME: Software, Writing – review & editing

KP: Conceptualization, Software, Funding acquisition, Writing – review & editing

# AI usage disclosure

After designing the software architecture and writing core functionalities, both open-weight and proprietary LLM-based chatbots were used to implement or debug some of the methods in `simshady`. Generative agentic AI tools that can write and edit code autonomously were not used. The open-weight models gpt-oss:120b and deepseek-r1:70b were used for reviewing the written text of this paper. Individual parts of the svg file for \autoref{fig:skydome-openpv} where created with the help of a proprietary LLM.

# Acknowledgements

The development of this software was funded by the German Federal Ministry of Research, Technology and Space within the "Software Sprint - Support for Open Source Developers" program by Prototype Fund.

# References
