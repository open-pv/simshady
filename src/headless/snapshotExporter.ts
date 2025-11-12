import { Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { CLIOptions } from '../types/CLIOptions';

/**
 * Class for generating a top-down screenshot of a mesh that sits in the browser memory.
 */
export class SnapshotExporter {
  /**
   * Check if provided image size is in correct format, then start the actual top down snapshot generation
   */
  static async startTopDownGeneration(page: Page, options: CLIOptions): Promise<void> {
    try {
      const topdownString = options.topdownSize?.split('x');
      if (topdownString == undefined || topdownString.length !== 2) {
        console.warn('Provided --topdown-size was provided in wrong format. Use width x height e.g. "2048x20248".');
        console.warn('Snapshot generation skipped.');
      } else {
        const width = parseInt(topdownString[0]);
        const height = parseInt(topdownString[1]);
        await this.generateTopDown(page, options.outputDir!!, width, height);
      }
    } catch (e: any) {
      console.error('Snapshot generation failed:', e.message);
    }
  }

  /**
   * Generate an orthographic top-down image using functionality from three.js inside the browser.
   * @param page The browser page containing the mesh to render
   * @param outputDir The directory where the image should get saved
   * @param width Width of the image.
   * @param height Height of the image.
   */
  static async generateTopDown(page: Page, outputDir: string, width: number = 2048, height: number = 2048): Promise<void> {
    // Set viewport
    await page.setViewport({ width, height });

    // Inject rendering code
    const imageData = await page.evaluate(
      async ({ w, h }) => {
        const { mesh } = (window as any).__simshady__;
        const { Scene, WebGLRenderer, OrthographicCamera, DirectionalLight, AmbientLight, Box3, Vector3 } = await import('three');

        // Create scene
        const scene = new Scene();
        scene.add(mesh);

        // Calculate bounding box
        const bbox = new Box3().setFromObject(mesh);
        const center = new Vector3();
        const size = new Vector3();
        bbox.getCenter(center);
        bbox.getSize(size);

        // Setup orthographic camera (top-down)
        const aspect = w / h;
        const frustumSize = Math.max(size.x, size.y);
        const camera = new OrthographicCamera(
          (-frustumSize * aspect) / 2,
          (frustumSize * aspect) / 2,
          frustumSize / 2,
          -frustumSize / 2,
          0.1,
          size.z * 10,
        );
        camera.position.set(center.x, center.y, center.z + size.z * 2);
        camera.lookAt(center);

        // Lighting (Ambient everywhere and directional light from the top)
        const ambientLight = new AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const directionalLight = new DirectionalLight(0xffffff, 0.4);
        directionalLight.position.set(0, 0, 1);
        scene.add(directionalLight);

        // Render
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const renderer = new WebGLRenderer({
          canvas,
          antialias: true,
          preserveDrawingBuffer: true,
        });
        renderer.setSize(w, h);
        renderer.render(scene, camera);

        // Get image data
        return canvas.toDataURL('image/png');
      },
      { w: width, h: height },
    );

    // Save to file
    const snapshotPath = path.join(outputDir, 'snapshot_topdown.png');
    const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
    await fs.promises.writeFile(snapshotPath, base64Data, 'base64');
  }
}
