import { Component, ViewChild, ElementRef, AfterViewInit, Renderer2 } from '@angular/core';
import { Color, Path, Point, Project, PointText, Raster, Group } from 'paper/dist/paper-core';
import { Star, CircleData, Planet, StarSystem, CircleSprite } from './types';

@Component({
    selector: 'app-star-map',
    templateUrl: './star-map.component.html',
    styleUrls: ['./star-map.component.scss']

})
export class StarMapComponent implements AfterViewInit {
    @ViewChild('canvas') canvas: ElementRef<HTMLCanvasElement> = {} as ElementRef<HTMLCanvasElement>;
    @ViewChild('planet') planet: ElementRef<HTMLImageElement> = {} as ElementRef<HTMLImageElement>;


    public project: any; // paper.js root project
    starSystemList: StarSystem[] = [];
    public isViewingSystem: boolean = false;
    public hasClicked: boolean = false;
    public hasClickedPlanet: boolean = false;
    public followSystem: boolean = false;
    public viewSystem: StarSystem = {} as StarSystem;

    // this variable is used to reassign a star with its original coordinates after backing out from star system view
    public saveStar: Star = {} as Star;
    public viewPlanet: Planet = {} as Planet;
    private collidingPlanet: Planet = {} as Planet;
    public isSystemView: boolean = false;
    private orbitTracker: any = {}
    private animationId: number = -1;

    private collideSystem: StarSystem = {} as StarSystem;
    private _circleStrokeColour = 'white';
    private _circleStrokeWidth = 2;
    private _selectStrokeWidth = 2;
    private _selectStrokeColour = 'red';
    private _highlightStrokeWidth = 2;
    private _highlightStrokeColour = 'yellow';
    private _hightlightOrbitWidth = 0.5;
    private _highlightOrbitColour = 'white';
    private _selectOrbitWidth = 1;
    private _selectOrbitColour = 'white';
    private _orbitStrokeWidth = 0.2;
    private _orbitStrokeColour = 'lightgray';
    private textColour: string = 'white';
    private textFont: string = 'Arial'
    private textSize: number = 15;
    private viewSystemZoom: number = 3;
    private addOrbitAngle: number = 60;

    constructor(private renderer: Renderer2) {

    }

    ngAfterViewInit(): void {
        this.project = new Project(this.canvas.nativeElement);

        setTimeout(() => {
            // get star systems from api
            // or use this test method
            this.createStarSystems();
            this.drawScene();
        }, 0);
    }

    public drawScene(animate = false) {
        setTimeout(() => {
            this.project.clear();
            if (this.isSystemView) {
                this.drawStarSystem();
                if (animate) {
                    this.animationId = window.requestAnimationFrame(() => {
                        this.planetsOrbitStar();
                        this.drawScene(true);
                    });
                }
                this.drawPlanets(this.viewSystem.planets);

                this.project.view.draw();
            } else {
                this.drawStars();
            }
        });
    }

    public onMouseMove(e: any) {
        let mousePoint = new Point(e.offsetX, e.offsetY);

        if (this.isSystemView) {
            // in star system view
            const collidingCircle = this.collideCircles(mousePoint, [...this.viewSystem.planets, this.viewSystem.star]);
            const collidingOrbit = this.getOrbitCircleCollision(mousePoint);
            if (!!Object.entries(collidingCircle).length) {
                if (this.viewSystem.star.collided) {
                    if (!!Object.entries(this.collidingPlanet).length && this.collidingPlanet != this.viewPlanet) {
                        this.resetCircleStroke(this.collidingPlanet.orbitCircle, this._orbitStrokeColour, this._orbitStrokeWidth);
                    }
                    console.log('star!')
                    // the star was hovered over
                } else {
                    const collidingPlanet = this.getCollidedPlanet();
                    if (!!Object.entries(collidingPlanet).length) {
                        if (!!Object.entries(this.collidingPlanet).length && this.collidingPlanet != this.viewPlanet) {
                            this.resetCircleStroke(this.collidingPlanet.orbitCircle, this._orbitStrokeColour, this._orbitStrokeWidth);
                        }

                        // a planet was hovered over
                        this.collidingPlanet = collidingPlanet;
                        if (this.collidingPlanet != this.viewPlanet) {
                            this.highlightCircle(collidingPlanet.orbitCircle, this._highlightOrbitColour, this._hightlightOrbitWidth);
                        }
                    } else {
                        console.log('something bad')
                    }
                }
                this.setCursor('pointer');
            } else if (!!Object.entries(collidingOrbit).length) {
                // mouse collision with an orbit circle
                if (!!Object.entries(this.collidingPlanet).length && this.collidingPlanet != this.viewPlanet) {
                    this.resetCircleStroke(this.collidingPlanet.orbitCircle, this._orbitStrokeColour, this._orbitStrokeWidth);
                }

                // a planet orbit was hovered over
                this.collidingPlanet = collidingOrbit;
                this.collidingPlanet.collided = true;
                if (this.collidingPlanet != this.viewPlanet) {
                    this.highlightCircle(this.collidingPlanet.circle);
                    this.highlightCircle(this.collidingPlanet.orbitCircle, this._highlightOrbitColour, this._hightlightOrbitWidth);
                }
                this.setCursor('default');
            } else {
                this.setCursor('default');
                if (!!Object.entries(this.collidingPlanet).length && this.collidingPlanet != this.viewPlanet) {

                    this.resetCircleStroke(this.collidingPlanet.orbitCircle, this._orbitStrokeColour, this._orbitStrokeWidth);
                    this.collidingPlanet = {} as Planet;

                }
            }
        } else {
            // in star map view
            let collidingSystem = this.getStarCollision(mousePoint);
            if (!!Object.entries(collidingSystem).length) {
                if (collidingSystem !== this.viewSystem) {
                    this.highlightCircle(collidingSystem.star.circle);
                    this.collideSystem = collidingSystem;
                }
                this.setCursor('pointer');

            } else {
                this.setCursor('default');
                if (!!Object.entries(this.collideSystem).length && this.collideSystem != this.viewSystem) {
                    this.resetCircleStroke(this.collideSystem.star.circle)
                    this.collideSystem = {} as StarSystem;
                }
            }
        }
        this.drawScene();

    }

    public onMouseClick(e: any) {
        let mousePoint = new Point(e.offsetX, e.offsetY);
        if (this.isSystemView) {
            // star system view
            const clickedCircle = this.clickCircles(mousePoint, [...this.viewSystem.planets, this.viewSystem.star]);
            const collidingOrbit = this.getOrbitCircleCollision(mousePoint);
            if (!!Object.entries(clickedCircle).length) {
                // the star or a planet was clicked
                if (this.viewSystem.star.clicked) {
                    if (!!Object.entries(this.viewPlanet).length) {
                        this.resetCircleStroke(this.viewPlanet.circle);
                        this.resetCircleStroke(this.viewPlanet.orbitCircle, this._orbitStrokeColour, this._orbitStrokeWidth);
                    }
                    // the star was clicked
                    console.log('star clicked!')
                } else {
                    const clickedPlanet = this.getClickedPlanet();
                    if (!!Object.entries(clickedPlanet).length) {
                        if (!!Object.entries(this.viewPlanet).length && !this.viewPlanet.clicked) {
                            this.resetCircleStroke(this.viewPlanet.orbitCircle, this._orbitStrokeColour, this._orbitStrokeWidth);
                        }
                        // a planet was clicked
                        this.viewPlanet = clickedPlanet;
                        this.hasClickedPlanet = true;
                        this.highlightCircle(this.viewPlanet.orbitCircle, this._selectOrbitColour, this._selectOrbitWidth);
                    } else {
                        console.error('Should have received a clicked planet', clickedPlanet);
                    }
                }

            } else if (!!Object.entries(collidingOrbit).length) {
                // mouse click on orbit circle
                if (!!Object.entries(this.viewPlanet).length && !this.viewPlanet.clicked) {
                    this.resetCircleStroke(this.viewPlanet.orbitCircle, this._orbitStrokeColour, this._orbitStrokeWidth);
                }

                // a planet orbit was clicked over
                this.viewPlanet = collidingOrbit;
                this.viewPlanet.clicked = true;
                this.viewPlanet.collided = false;
                this.hasClickedPlanet = true;
                this.selectCircle(this.viewPlanet.circle);
                this.selectCircle(this.viewPlanet.orbitCircle, this._selectOrbitColour, this._selectOrbitWidth);
            } else {
                // the user clicked but not on a star or planet
                this.resetCircleStroke(this.viewPlanet.orbitCircle, this._orbitStrokeColour, this._orbitStrokeWidth);
                this.viewPlanet = {} as Planet;
                this.hasClickedPlanet = false;
            }
        } else {
            // star map view
            const clickedSystem = this.getStarCollision(mousePoint);
            if (!!Object.entries(clickedSystem).length) {
                if (!!Object.entries(this.viewSystem).length) {
                    this.resetCircleStroke(this.viewSystem.star.circle);
                }
                this.selectCircle(clickedSystem.star.circle);
                this.viewSystem = clickedSystem;
                this.hasClicked = true;
            } else {
                this.hasClicked = false;
                this.resetCircleStroke(this.viewSystem.star.circle);

                this.viewSystem = {} as StarSystem;
            }
        }

        this.drawScene();
    }

    private fixCircleStroke(circle: CircleSprite) {
        if (circle.clicked) {
            this.selectCircle(circle.circle);
        } else if (circle.collided) {
            this.highlightCircle(circle.circle);
        } else {
            this.resetCircleStroke(circle.circle);
        }
    }
    private highlightCircle(circle: CircleData, strokeColour = this._highlightStrokeColour, strokeWidth = this._highlightStrokeWidth) {
        circle.strokeColour = strokeColour;
        circle.strokeWidth = strokeWidth;
    }
    private selectCircle(circle: CircleData, strokeColour = this._selectStrokeColour, strokeWidth = this._selectStrokeWidth) {
        circle.strokeColour = strokeColour;
        circle.strokeWidth = strokeWidth;
    }
    public resetCircleStroke(circle: CircleData, strokeColour = this._circleStrokeColour, strokeWidth = this._circleStrokeWidth) {
        circle.strokeColour = strokeColour;
        circle.strokeWidth = strokeWidth;
    }
    private setCursor(type: string) {
        window.document.getElementById("star-map").style.cursor = type;
    }

    private getOrbitCircleCollision(xy: paper.Point) {
        let collision = {} as Planet;
        for (let i = 0; i < this.viewSystem.planets.length; i++) {
            if (!!Object.entries(this.viewSystem.planets[i].orbitCirclePath).length && (this.viewSystem.planets[i].orbitCirclePath.contains(xy))) {
                collision = this.viewSystem.planets[i];
                break;
            }
        }
        return collision;
    }

    private collideCircles(xy: paper.Point, circleList: CircleSprite[]) {
        var collidedCircle = {} as CircleSprite;
        circleList.forEach((circle) => {
            const collision = circle.circlePath.contains(xy)
            circle.collided = collision;
            this.fixCircleStroke(circle);
            if (collision) {
                collidedCircle = circle;
            }
        });
        return collidedCircle;
    }

    private clickCircles(xy: paper.Point, circleList: CircleSprite[]) {
        var clickedCircle = {} as CircleSprite;
        circleList.forEach((circle) => {
            const clicked = circle.circlePath.contains(xy);
            circle.clicked = clicked;

            this.fixCircleStroke(circle);
            if (clicked) {
                clickedCircle = circle;
            }
        });
        return clickedCircle;
    }

    private getCollidedPlanet() {
        var collision = {} as Planet

        this.viewSystem.planets.forEach((planet) => {
            if (planet.collided) {
                collision = planet;
            }
        });

        return collision;
    }
    private getClickedPlanet() {
        var clicked = {} as Planet

        this.viewSystem.planets.forEach((planet) => {
            if (planet.clicked) {
                clicked = planet;
            }
        });

        return clicked;
    }

    private getStarCollision(xy: paper.Point) {
        let collision = {} as StarSystem;
        for (let i = 0; i < this.starSystemList.length; i++) {

            if (!!Object.entries(this.starSystemList[i].star.circlePath).length && this.starSystemList[i].star.circlePath.contains(xy)) {
                collision = this.starSystemList[i];
            }
        }
        return collision;
    }

    private getRandomCircle(point: paper.Point, minSize: number, maxSize: number): CircleData {
        let fillColour = this.getRandomColourCode();
        let size = this.randInt(minSize, maxSize)
        return this.getCircle(
            point,
            size,
            fillColour,
        )
    }

    private getCirclePoint(center: paper.Point, radius: number, angle: number) {
        // Where r is the radius, cx,cy the origin, and a the angle.
        return new Point(
            center.x + (radius * Math.cos(angle)),
            center.y + (radius * Math.sin(angle)),
        )
    }

    public createStarSystems() {
        let prevPoint = {
            x: 10,
            y: 200
        } as paper.Point;

        const num_systems = this.randInt(5, 10)
        for (let i = 0; i < num_systems; i++) {
            let point = {
                x: prevPoint.x + this.randInt(50, 100),
                y: Math.max(prevPoint.y + this.randInt(-50, 50), 50)
            } as paper.Point;

            let starCircle = this.getRandomCircle(point, 15, 30);

            const star: Star = {
                id: i,
                name: `Trimester ${(i % 3) + 1}`,
                size: starCircle.radius,
                circle: starCircle,
                circlePath: {} as paper.Path,
                clicked: false,
                collided: false
            }

            let planets = [];
            let angleCtr = 0;
            let addOrbitDist = 20;
            let maxOrbitDist = 200;
            let orbitCtr = 0;
            for (let j = 0; j < this.randInt(5, 10); j++) {

                let orbitDist = (star.size * this.viewSystemZoom) + ((++orbitCtr * addOrbitDist) % maxOrbitDist)
                let angle = angleCtr;
                angleCtr += this.addOrbitAngle;
                let planetPoint = this.getCirclePoint(this.getCanvasMidPoint(), orbitDist, angle);
                let orbitCircle = this.getCircle(this.getCanvasMidPoint(), orbitDist, '', this._orbitStrokeColour, this._orbitStrokeWidth);
                let planetCircle = this.getRandomCircle(planetPoint, 10, 15);

                const planet: Planet = {
                    id: i + j,
                    size: planetCircle.radius,
                    circle: planetCircle,
                    orbitCircle: orbitCircle,
                    offset: {
                        x: starCircle.center.x - planetCircle.center.x,
                        y: starCircle.center.y - planetCircle.center.y,
                    } as paper.Point,
                    name: 'Planet ' + (i + j),
                    circlePath: {} as paper.Path,
                    orbitCirclePath: {} as paper.Path,
                    clicked: false,
                    collided: false
                }
                planets.push(planet);
            }


            const name = 'Lorem Ipsum Det Tolar';
            const status = this.randInt(0, 1) ? 'Completed' : 'Incomplete';
            const starSystem: StarSystem = {
                id: i,
                star,
                planets,
                name,
                status,

            }
            this.starSystemList.push(starSystem);
            prevPoint = point;
        }
    }
    private getCircle(center: paper.Point, radius: number, fillColour = 'yellow', strokeColour = this._circleStrokeColour, strokeWidth = this._circleStrokeWidth): CircleData {
        return {
            center,
            radius,
            fillColour,
            strokeColour,
            strokeWidth
        };
    }
    private drawCirclePath(circle: CircleData) {
        let path = new Path.Circle({ center: circle.center, radius: circle.radius });
        if (circle.strokeColour) {
            path.strokeColor = new Color(circle.strokeColour);
        }
        if (circle.fillColour) {
            path.fillColor = new Color(circle.fillColour);

        }
        if (circle.strokeWidth) {
            path.strokeWidth = circle.strokeWidth;
        }
        return path;
    }
    private drawStarName(xy: paper.Point, content: string, x_offset: number, y_offset: number) {
        const point = {
            x: xy.x + x_offset,
            y: xy.y + y_offset
        }

        const pt = new PointText({
            point,
            content,
            fillColor: this.textColour,
            fontFamily: this.textFont,
            fontSize: this.textSize,
        });
    }
    private drawText(xy: paper.Point, content: string, x_offset: number, y_offset: number) {
        const point = {
            x: xy.x + x_offset,
            y: xy.y + y_offset
        }

        const pt = new PointText({
            point,
            content,
            fillColor: this.textColour,
            fontFamily: this.textFont,
            fontSize: this.textSize,
        });
    }



    public drawPlanets(planets: Planet[], orbits = true) {
        if (orbits) {
            planets.forEach((planet) => {
                planet.orbitCirclePath = this.drawCirclePath(planet.orbitCircle);
            });
        }
        planets.forEach((planet) => {
            planet.circle = this.getCircle(planet.circle.center, planet.circle.radius, planet.circle.fillColour, planet.circle.strokeColour, planet.circle.strokeWidth);
            planet.circlePath = this.drawCirclePath(planet.circle);
        });
        return planets;
    }

    public drawStarSystem() {
        // user just switched to view a star system
        if (!this.isViewingSystem) {
            this.saveStar = Object.assign({}, this.viewSystem.star);
            this.viewSystem.star.circle = this.getCircle(this.getCanvasMidPoint(), this.viewSystem.star.circle.radius * this.viewSystemZoom, this.viewSystem.star.circle.fillColour, this.viewSystem.star.circle.strokeColour, this.viewSystem.star.circle.strokeWidth)
            this.isViewingSystem = true;
            window.cancelAnimationFrame(this.animationId);
        }
        this.viewSystem.star.circlePath = this.drawCirclePath(this.viewSystem.star.circle);
    }

    public drawStars() {
        // reset if user is going from solar view to system view
        if (this.isViewingSystem) {
            this.isViewingSystem = false;
            if (this.hasClickedPlanet) {
                this.viewPlanet.clicked = false;
                this.viewPlanet.collided = false;
                this.resetCircleStroke(this.viewPlanet.circle);
                this.resetCircleStroke(this.viewPlanet.orbitCircle, this._orbitStrokeColour, this._orbitStrokeWidth);
                this.hasClickedPlanet = false;
            }
            this.viewSystem.star = this.saveStar;
        }
        if (!!this.starSystemList.length) {
            // this loops are split to ensure objects are placed in the correct layer
            // names should be above planets should be above lines
            let prevStar = this.starSystemList[0].star;
            for (let i = 1; i < this.starSystemList.length; i++) {
                const star = this.starSystemList[i].star;
                this.drawLineBetween(prevStar.circle.center, star.circle.center);
                prevStar = star;
            }
            for (let i = 0; i < this.starSystemList.length; i++) {
                const star = this.starSystemList[i].star;
                star.circlePath = this.drawCirclePath(star.circle);
            }
            for (let i = 0; i < this.starSystemList.length; i++) {
                const star = this.starSystemList[i].star;
                this.drawStarName(star.circle.center, star.name, -10, -30);
            }
        }
    }

    private getCanvasMidPoint(): paper.Point {
        return new Point(
            this.canvas.nativeElement.clientWidth / 2,
            this.canvas.nativeElement.clientHeight / 2
        );
    }

    private drawLineBetween(point_1: paper.Point, point_2: paper.Point, colour = 'white') {
        let path = new Path.Line(point_1, point_2);
        path.strokeColor = new Color(colour);
    }

    private getRandomColourCode() {
        let makeColorCode = '0123456789ABCDEF';
        let code = '#';
        for (let count = 0; count < 6; count++) {
            code = code + makeColorCode[Math.floor(Math.random() * 16)];
        }
        return code;
    }

    private randInt(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    private reorder(data: Array<any>, index: number) {
        return data.slice(index).concat(data.slice(0, index))
    };

    private planetsOrbitStar() {
        for (var i = 0; i < this.viewSystem.planets.length; i++) {
            if (this.viewSystem.planets[i].collided || this.viewSystem.planets[i].clicked) {
                // dont animate any planets that have collided or clicked
                continue;
            }

            if (Object.keys(this.orbitTracker).includes(this.orbitTracker[i])) {
                this.orbitTracker[i]++;
            } else {
                this.orbitTracker[i] = 1
            }

            var orbitSpeed = this.orbitTracker[i];
            var angle = this.getAngle(this.viewSystem.star.circle.center, this.viewSystem.planets[i].circle.center);
            angle = angle + orbitSpeed / this.viewSystem.planets[i].size % 360;
            angle = (Math.PI * angle) / 180;

            this.viewSystem.planets[i].circle.center = this.getCirclePoint(
                this.viewSystem.star.circle.center,
                this.getDistance(this.viewSystem.star.circle.center, this.viewSystem.planets[i].circle.center),
                angle
            );
        }
    }

    private getDistance(point1: paper.Point, point2: paper.Point) {
        return Math.sqrt((point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2)
    }
    private getAngle(point1: paper.Point, point2: paper.Point) {
        var dy = point2.y - point1.y;
        var dx = point2.x - point1.x;
        var theta = Math.atan2(dy, dx); // range (-PI, PI]
        theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
        return theta;
    }
}