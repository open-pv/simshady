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

date: 11 March 2026
bibliography: paper.bib
#This paper compiles with the following command: docker run --rm --volume .:/data --user $(id -u):$(id -g) --env JOURNAL=joss openjournals/inara
---

# Summary

openpv/simshady (short: `simshady`) is a JavaScript package for simulating photovoltaic (PV) energy yields. It integrates local climate data and 3D objects into its shading simulation, utilizing Three.js meshes for geometric modeling. The package performs shading analysis using a WebGL-parallelized implementation of the Möller-Trumbore intersection algorithm [@Möller01011997]. With the software, researchers can obtain both aggregated and spatial or temporally resolved simualted scenes of expected PV yields for further processing. Simshady provides both a package for web development, as well as a Command-line interface (CLI) tool for simulations on your machine.

# Statement of need

To meet global climate targets, solar photovoltaic (PV) capacity must expand significantly. Tripling renewable energy capacity by 2030 is essential to limit global warming to 1.5°C [@IEA2023]. The expansion of PV plays a crucial role, and PV systems offer an additional benefit: small-scale house-mounted PV systems enable public participation and legitimize the energy transition. For calculating the yield of PV systems, various factors are important, including the location of the planned installation, local climate, surrounding objects such as houses or trees, and terrain. To provide accurate estimates of expected yields, simulation tools are essential in both research and practical PV system planning. For these reasons, a variety of software tools for simulating photovoltaic systems already exist [@holmgren2018review; @jakica2018state; @KUMARVASHISHTHA20221450]. Simshady fills a gap in the area of detailed 3D shading simulation for PV yield estimation.

# State of the field

Existing software can roughly be grouped into three groups: full-suite commercial design tools, simplified yield calculators, and developer libraries.

Full-suite design tools target professional PV planners and combine 3D system modeling, component databases and financial analysis behind a graphical user interface. HelioScope by Aurora Solar is a web-based design platform that approximates near shading by projecting drop shadows from 3D objects rather than performing full ray tracing, and is offered as a paid subscription [@helioscope2026]. PV\*SOL premium by Valentin Software is a Windows desktop application that performs detailed sub-module shading analysis at cell level, but is restricted to interactive single-project use [@pvsol2026]. PVsyst is the industry reference for bankable yield reports and additionally provides a separately licensed command-line tool, PVsystCLI, which is the only existing software that combines accurate 3D near shading with batch automation, but at a cost of several thousand Swiss francs per year [@pvsyst2026]. The System Advisor Model (SAM) developed by NREL is open-source and exposes a Python wrapper (PySAM), but its 3D shading capabilities are limited compared to dedicated design tools [@sam2026].

Among the developer libraries, the Python package pvlib [@holmgren2018pvlib; @anderson2023pvlib] offers a range of functionalities. However, the rather niche topic of shading simulation with 3D objects is not included in this package. Another Python-based software that enables irradiance modeling in two dimensions is pvfactors [@pvfactors2025; @anoma_view_2017]. SoDeLe wraps pvlib in an end-user GUI for quick residential estimates and likewise omits 3D shading [@sodele2026]. Web-based tools for solar panel simulations, such as PVGIS, PVWatts, and RETScreen, provide an accessible means for non-technical individuals to estimate energy yields based on geographic location and building geometry [@psomopoulos2015comparative]. However, these tools lack the capability to perform shading simulations using 3D geometries.

Table \ref{tab:tool-comparison} summarises the tools by the capabilities most relevant to urban-scale PV assessment. Two patterns emerge. First, every tool that supports detailed 3D shading is either commercial or restricted to interactive single-project use; the only freely scriptable option, PVsystCLI, is paywalled. Second, none of the open-source developer libraries can model arbitrary 3D shading, and none of the surveyed tools is designed for batch processing on a city scale.

: Comparison of representative PV simulation tools by the capabilities most relevant to automated, city-scale assessment. Prices are approximate annual costs as of early 2026. \label{tab:tool-comparison}

| Tool          | Platform | Price [per year] | Open Source | 3D Shading   | CLI/ API | Electrical Model | Comp. DB | Financial Analysis | Source                                   |
| ------------- | -------- | ---------------- | ----------- | ------------ | -------- | ---------------- | -------- | ------------------ | ---------------------------------------- |
| HelioScope    | Web      | \$1,900          | No          | Yes          | API      | Sub-module       | Yes      | Yes                | [@helioscope2026]                        |
| PV\*SOL prem. | Desktop  | €845             | No          | Yes          | No       | Sub-module       | Yes      | Yes                | [@pvsol2026]                             |
| PVsyst        | Desktop  | €758             | No          | Yes          | CLI      | Sub-module       | Yes      | Yes                | [@pvsyst2026]                            |
| SAM           | Desktop  | Free             | Yes         | Limited      | PySAM    | Diode model      | Yes      | Yes                | [@sam2026]                               |
| PVGIS         | Web      | Free             | No          | Horizon only | API      | Factor           | No       | No                 | [@pvgis2026]                             |
| PVWatts       | Web      | Free             | Yes         | No           | API      | Factor           | No       | No                 | [@pvwatts2026]                           |
| SoDeLe        | Package  | Free             | Yes         | No           | Yes      | Diode model      | Yes      | No                 | [@sodele2026]                            |
| pvlib         | Package  | Free             | Yes         | No           | Yes      | Diode model      | Yes      | No                 | [@holmgren2018pvlib; @anderson2023pvlib] |
| pvfactors     | Package  | Free             | Yes         | 2D only      | Yes      | None             | No       | No                 | [@pvfactors2025; @anoma_view_2017]       |

`simshady` now fills two existing gaps: First, it is implemented in typescript and hence simultaniously enables simulations in the browser and on a local machine. And Second, it takles the calculation intensive task of raytracing for shading simulation with a performant WebGL implementation on the GPU. Since WebGL is not well known in the science community, simshady provides access to this simulation code via better known javascript methods.

# Software design

`simshady` simulates the yield of photovoltaic (PV) systems by considering weather/climate data and shading from local 3D geometry. It is built around three core principles: (1) To run the core simulation code efficiently on the GPU, (2) to expose two different interfaces for both browser-based applications and server-based simulation, and (3) to integrate standardized data models, namely from `Three.js` and from the Wavefront OBJ file format.

## Scene construction and input data

In simshady, a 3D scene is built that represents the environment, comprising primary objects for simulation (e.g., PV panels or target buildings) and surrounding objects that may cast shadows (e.g., neighboring buildings, trees). Weather and climate data are integrated using Global Horizontal Irradiance (GHI) and Direct Normal Irradiance (DNI) datasets, which are reconstructed to include directional irradiance information using the HEALPix framework [@Górski_2005; @zonca2019healpy].

## Simulation pipeline

The central `ShadingScene` class orchestrates the simulation through the following steps:

1. **Geometry pre-processing:** All geometries provided by the user are shifted to the coordinate origin to improve floating-point precision. The simulation mesh is then refined by recursively subdividing triangles whose longest edge exceeds a configurable threshold (default 1.0 m), ensuring a uniform spatial resolution for the irradiance calculation. Reducing this threshold results in a larger number of smaller triangles in the mesh, and therefore a higher resolution of the simulated shading. To improve the simulation speed, a geometry filter removes shading triangles that cannot cast shadows on the simulation geometry given the minimum solar altitude angle present in the irradiance dataset.

2. **Ray tracing:** The simulation utilizes the Möller-Trumbore intersection algorithm [@Möller01011997] to determine if any shading objects obstruct the view between a sky pixel and the main simulation geometry. For each triangle in the simulation geometry, a shading mask is generated, indicating whether an object blocks the line of sight from the sky pixel to the triangle. The shading mask values range from 0 to 1, where 0 indicates that an object shades the triangle, 1 signifies that there is no obstruction and the line of sight is perpendicular to the triangle, and values between 0 and 1 represent cases where there is no obstruction but the angle of incidence is not perpendicular. This computation is fully parallelizable and has been implemented using WebGL.

3. **Irradiance integration and yield calculation:** The radiance values from all sky segments are multiplied by their corresponding shading mask values and summed to obtain the total irradiance received by each triangle. The resulting intensities are converted to electrical yield (in kWh/m²) using a configurable solar-to-electricity conversion efficiency (default 15%). This efficiency includes the PV panel efficiency as well as the ratio of total area and area covered by PV panels.

4. **Visualization:** The computed yield values are normalized and mapped to RGB colors using a configurable colormap (default: viridis). The resulting Three.js mesh carries both the color attribute for visualization and per-triangle intensity attributes for further analysis or export to other formats.

## Simshady in the browser

Simshady reuses the data model and objects of `Three.js`, a common package for 3D web applications. The package processes `Three.js` meshes and adds the simulated PV yield as a color to the mesh, as shown in \autoref{fig:threejs-mesh}. Additionally, each triangle of the simulated buildings has its solar yield assigned as an attribute for further processing.

![A simulated building with its solar yield, where dark purple represents low yields and light yellow represents high yields. Screenshot taken from [@openpv] \label{fig:threejs-mesh}](screenshot-simulation-geometry.jpg){ width=90% }

## Simshady in the terminal

The `simshady` CLI is a wrapper around the core WebGL‑based simulation engine that enables batch processing of photovoltaic‑yield analyses on a server. It first parses a small set of required arguments (the simulation geometry and the irradiance data). The supplied geometry files, either JSON objects or Wavefront OBJ files, are handed to a headless Chromium instance launched via Puppeteer [@puppeteer].

Inside the browser context the full simshady package is injected, the scene is reconstructed, and the GPU‑accelerated Möller‑Trumbore ray‑tracing routine is executed. When the calculation finishes, the CLI extracts the mesh data from the browser and writes the following artefacts into the user‑specified output directory: binary files for vertex positions, colors, and intensities; a colour‑coded Wavefront OBJ file with per-vertex RGB values; an orthographic top‑down PNG snapshot of the scene; and a JSON summary containing per-timestep and total aggregated yield statistics such as total and mean yield or surface area.

# Research impact statement

## Tool landscape positioning

`simshady` together with its CLI occupies a position in the PV-tool landscape that previously did not exist. Two simple matrices, derived from the comparison in Table \ref{tab:tool-comparison}, highlight this.

The first matrix groups tools by cost and 3D shading capability. Up to now, every tool that offered full 3D shading of arbitrary geometries was a commercial product, while every free or open-source tool either ignored 3D shading or was restricted to highly simplified geometric assumptions. \autoref{fig:comp-cost} shows this comparison.

![Tool positioning by cost and 3D shading capability. Free tools historically lacked 3D shading; 3D capability required commercial licenses. simshady with its CLI is the first free tool with a full 3D shading capability. \label{fig:comp-cost}](comparison_matrix_cost_shading.png){ width=80% }

The second matrix groups the same tools by simulation scale and 3D shading capability. Tools that can be applied automatically to large numbers of buildings have so far skipped 3D shading entirely; tools with accurate 3D shading have been built around interactive single-project workflows. \autoref{fig:comp-scale} shows this comparison.

![Tool positioning by simulation scale and 3D shading capability. City-scale PV assessment with accurate 3D shading was not possible before simshady and its CLI. \label{fig:comp-scale}](comparison_matrix_scale_shading.png){ width=80% }

In both matrices the cell that `simshady` now occupies was empty before this work. `simshady` is therefore the first free and open-source tool with full 3D shading of arbitrary geometries, and the first such tool designed to handle both single buildings or entire cities.

## City-scale demonstration: Munich

To show that this position is more than theoretical, the CLI was used to simulate the PV yield for the entire city of Munich. The original data consists of 109 CityGML LoD2 tiles. Each tile had a size of 2x2 km^2. For processing purposed each tiles was split into four tiles, one square kilometre each. The data contains roughly 200 km² of building surface in total. Hourly Deutscher Wetterdienst irradiance data from 2018 was projected onto a HEALPix sky and ray-traced against the full geometry. The same CLI workflow that any user can apply to their own input data produced per-triangle yield artefacts for every tile: binary vertex/colour/intensity buffers, vertex-coloured OBJ meshes, orthographic top-down PNG snapshots, and JSON yield summaries. \autoref{fig:munich-tile} shows the 3D mesh output for one tile, and \autoref{fig:snapshot_topdown} shows the orthographic top-down PNG that the CLI generates for the full city.

![3D mesh output of the CLI for a single Munich tile, with per-triangle annual PV yield mapped onto the building geometry (dark purple = low, light yellow = high). \label{fig:munich-tile}](munich-tile-perspective.png){ width=80% }

![Orthographic top-down PNG snapshot generated by the CLI for a single tile. \label{fig:snapshot_topdown}](cli_snapshot_topdown_example.png){ width=80% }

The complete simulation took roughly 110 hours on a single cloud GPU server running four parallel CLI instances and cost less than 60 USD. The full output, including geometry, intensities, metadata and visualisation artefacts for all tiles, is openly available as a dataset on Zenodo under CC BY 4.0 [@simshady_munich_dataset].

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
