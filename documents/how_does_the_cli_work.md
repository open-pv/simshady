---
title: CLI
---

# The simshady CLI

You can use simshady in two ways, either as a package for client side simulation **in the browser**, or as a Command Line Interface (CLI) Tool to run the simulation **on a server**. This section will introduce the functionality of the CLI tool.

### Installation

```bash
    # install simshady temporarily and execute it directly
    npx @openpv/simshady run --simulation-geometry ...

    # or install simshady globally with
    npm install -g @openpv/simshady

    # then run the cli
    simshady run --simulation-geometry ...
```
#### Setting up a server
A couple of preparation steps might be necessary for running the simshady CLI on a server. The following setup was done on a fresh install of an Ubuntu 22.04 VM with a NVIDIA GPU.
```bash
# install npm
apt-get update && apt-get install npm

# install adequate node version e.g. v24.13.0.
#...

# sound library required by chrome
sudo apt-get install libasound2
# depending on which configuration you are planning on running you might need to install graphics libraries as well.
sudo apt-get install -y libx11-xcb1 libgl1-mesa-dri libgbm1 libdrm2 libxcb-dri3-0 libxshmfence1 libegl1 libgles2
```
For our setup we ran using Vulkan. It was therefore necessary to set the following Chrome arguments in order to use the GPU for WebGL2:
```bash
    simshady run --simulation-geometry ... --irradiance-data ... \
    --chrome-args "--use-gl=angle --use-angle=vulkan --enable-features=Vulkan --ignore-gpu-blocklist --disable-gpu-sandbox"
```

### Example Usage

```bash
    simshady run \
    --simulation-geometry /path/to/sim_file.obj \
    --shading-geometry /path/to/shade_file.obj \
    --irradiance-data /path/to/irr.json \
    --output-dir /path/to/output
```

Details about all parameters can be found [here](/simshady/functions/headless_cli.main.html) or by running `simshady --help`.

You can test out the CLI by running the test in _cli.test.ts_

### Artifacts

After successful simulation, artifacts can be created. These can be used to analyze the simulation or serve as an intermediate
result for further work. The CLI parameters can be used to control which artifacts are to be created. The artifacts get stored in the following way:

- output_directory/

  - mesh/

    - colors.bin
    - intensities.bin
    - positions.bin

    Contains the Float32Array data in binary format. The data can get loaded using a buffer and simple constructor:

        const buffer = await fs.readFile(filePath)
        new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4)

  - mesh.obj

    OBJ File in format: v x y z r g b

    This format although not officially supported, can be imported into 3D rendering tools like Blender. To visualize the
    result, import the mesh.obj into Blender then switch to "Vertex Paint" mode. The mesh does not get centered, so it might
    be necessary to "Frame All" via the View options. Also, the dimensions of the mesh can be quite large, so there might occur
    view distance clipping. This can be fixed by increasing the clip "End" distance via the View Tab on the side.

  - snapshot_topdown.png

    An orthographic snapshot of the simulation geometry from the bird’s perspective. The snapshot is being captured directly in the browser environment.

  - summary.json

    JSON file which stores the sum, the mean, and the theoretical maximum yield, as
    well as the total area and the active area for each timestep. For all the per timestep fields there is an aggregated
    version at the end of the file.

  - metadata.json

    A collection of metadata which contains all information describing the run.

### Technical Overview

**tl;dr** The [`CLI`](/simshady/functions/headless_cli.main.html) wraps the original functionality of simshady using a headless browser to run simshady without a visible browser window.

The technical architecture looks as follows:

#### 1. CLI-Wrapper

The [`CLI`](/simshady/functions/headless_cli.main.html) is responsible for parsing the arguments and then validates that all necessary parameters exist.
The data parameters are then passed to the DataLoader class _**dataloader.ts**_.

#### 2. Data loading

The DataLoader loads the data depending on the file and path type, i.e., single file, multiple files, or a directory.
The simulation and shading geometries can be loaded either from JSON in the format _{ positions: number[] }_ or from an OBJ file.
For irradiance data, a JSON file in the format of _SolarIrradianceData_ is required. The smallest possible parameterization
for a run is _**--simulation-geometry**_ and _**--irradiance-data**_. 

Objects of the _**--shading-geometry**_ that are far away do not shade our _simulation geometry_, hence they can be neglected. 
Therefore, the irrelevant triangles of the _shading geometry_ get filtered out before the data gets moved into the 
browser memory. The value of _**--min-sun-angle**_ is used if it is set, otherwise the minimum angle of the 
_SolarIrradianceData_ is used. The shading geometry is filtered based on the simulation geometry bounding box and the 
minimum radiance angle. For this purpose, the distance from the bounding box and the height required with the minimum 
angle are calculated. If at least one vertex of a triangle is above this height, the triangle continues to be used for 
the shading geometry, otherwise it is removed. In simple terms, if at least one corner of a triangle can block radiation
from the simulation geometry, it remains part of the shading geometry.

After the data has been loaded and filtered, it is transferred to the headless Chrome runner _**headlessBrowser.ts**_ together
with the CLI parameters.

#### 3. Headless browser

Here, a headless Chrome browser is launched using the Puppeteer package. Puppeteer is one of the most widely used packages
for browser automation, CI, and testing. To ensure successful calculation, it is first verified that the browser is running with WebGL2.
Then the browser is launched. The built simshady package and the three.js dependency are dynamically loaded into the browser
context using dependency injection. The data is loaded chunk wise into the browser memory to circumvent limits regarding
the maximum string size of node.js. During transfer to the browser, all variables are temporarily converted to strings.
In the browser context itself, the data is then processed in the correct original data format. However, the maximum string
limits are significantly smaller than the limits for number arrays, which is why moving them directly to the browser context
would cause problems. After all dependencies and data have been loaded into the browser, the actual simshady simulation is executed.
There is a progress indicator which shows the overall progress, the elapsed time, and an estimate of the remaining duration.

#### 4. Ray tracing

The logic of the ray tracing algorithm has not changed compared to before the CLI PR. Before the changes of this work, the
intensity for all simulation triangles was calculated at once for each skysegment direction. The parallelization of the actual
work was left to the GPU. However, during development, it became apparent that errors occur when shading is calculated for
large simulation geometries. For large numbers of triangles, silent errors occur in calculations within the GPU. Instead
of calculating the accurate intensity, an intensity of 0 is calculated for almost all simulation geometry triangles. This
problem can be solved by splitting the calculation of the shading into chunks instead of calculating the shading effect of
the entire shading geometry at once. This is achieved by means of a nested loop within the skysegment direction loop. This
nested loop breaks down the entire shading geometry into 4096 triangles each and calculates the shading through these 4096
triangles. The shading mask is then composed of the minimum intensity values from all shading iterations.

#### 5. Artifact generation

After the simshady simulation has finished, the new mesh data (positions, colors and intensities) is loaded chunkwise from
the browser context. Then, if active, artifact generation is started. Depending on the configuration, different artifacts
are generated. First, a metadata file is created that records the run configuration used, the key data of the simulation
data (number of triangles and vertices), bounding box, and run start and end points. The calculated colors and intensity
values are also stored in .bin files alongside the position values. In addition, a top-down snapshot rendered in the browser
context can be created. Finally, a JSON file is created in which the sum, the mean, and the theoretical maximum yield, as
well as the total area and the active area are stored for each timestep. In addition, an OBJ file can be created consisting
of the vertices and colors in the format (v x y z r g b). Although this is not the standard OBJ format, many 3D rendering
programs, such as Blender, can work with this format without any problems.
