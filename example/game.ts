import * as ex from 'excalibur';
import { PerlinDrawer2D, PerlinGenerator } from '@excalibur-perlin';
const generator = new PerlinGenerator({
    seed: 515,
    octaves: 15,
    frequency: 2,
    amplitude: 0.5,
    persistance: 0.5
  });

const perlinCanvas = document.createElement('canvas');
perlinCanvas.width = 150;
perlinCanvas.height = 150;

// perlin generation is super intense and seems to wedge if we go any larger that 150x150
const drawer = new PerlinDrawer2D(generator);

const game = new ex.Engine({
    width: 800,
    height: 600,
    canvasElementId: 'game'
});
const perlinImage = new ex.ImageSource('./expected-perlin.png');
game.start(new ex.Loader([perlinImage])).then(() => {
    const canvas = new ex.Canvas({
        width: 800,
        height: 600,
        cache: true,
        draw: (ctx) => {
            drawer.draw(ctx, 0, 0, 800, 600);
        }
    });
    const actor = new ex.Actor({x: 0, y: 0, width: 800, height: 600});
    actor.graphics.use(canvas);
    actor.graphics.anchor = ex.Vector.Zero;
    game.add(actor);
});