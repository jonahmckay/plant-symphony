"use strict";

/********************************************************************

Plant Symphony (working title)
Jonah McKay

Plant Symphony is a web application that allows for participating in the
growth of virtual plant-like forms in a 3D space, and then using the
plant to create music.

*********************************************************************/

//Amount of parts created. Used by partID.
//TODO: This will break if I ever make a save/reload function.
let partCount = 0;

function clonePart(part) {
  //Clones a part.
  //TODO: Make this actually consider things like rotation instead
  //of just randomizing them. This is a bad solution, these things should be
  //done in production rules!
  let newPart = new Part();

  newPart.length = part.length;
  newPart.lastLength = part.length;
  newPart.thickness = part.thickness;
  newPart.rules = part.rules;
  newPart.relativePosition = new THREE.Vector3();
  newPart.stickPosition = part.stickPosition;
  newPart.relativeRotation = part.relativeRotation;
  newPart.partID = partCount;
  newPart.name = part.name;
  newPart.model = part.model;
  partCount++;

  newPart.children = [];

  return newPart;
}

function getPositionFromBottom(bottomPosition, rotation, length)
{
  //Gets the middle position of a cylinder based on its bottom position.
  //Used because AFrame primitive positions are calculated from their middle,
  //not their bottom, because that would be convenient for me.

  //Unfortunately I'm not great at vector math and such, so this only works if
  //the cylinder in question has no Y rotation as represented by Euler Angles.
  //Luckily I don't _need_ Y rotation, but it is an annoying restriction.
  //TODO: Solve this issue by either making it work with Y rotation, or perhaps by
  //making parts use a custom 3D model with its origin at the bottom?

  let middlePosition = new THREE.Vector3().copy(bottomPosition);

  let rotatedOffset = new THREE.Vector3(0, length/2, 0);
  let lengthRotation = new THREE.Euler(rotation.x, 0, rotation.z);
  rotatedOffset.applyEuler(lengthRotation);

  return middlePosition.add(rotatedOffset);
}

//Base class for different rules performed each part growth tick.
class Rule
{
  constructor()
  {
    this.baseChance = 0.1;
    this.name = "unnamedRule";

    //
    this.ruleType = "baseRule";
  }

  ruleTick(target)
  {
    //Placeholder, simply checks against baseChance.
    if (Math.random() < this.baseChance)
    {
      this.rulePass(target);
      return true;
    }
    else
    {
      this.ruleFail(target);
      return false;
    }
  }

  rulePass(target)
  {
    return false;
  }

  ruleFail(target)
  {
    return false;
  }

}

//Rule for creating new parts.
class ProductionRule extends Rule
{
  constructor(part)
  {
    super();
    this.ruleType = "productionRule";

    this.basePart = part;

    this.stickPositionLowerBound = 0;
    this.stickPositionUpperBound = 1;

    this.baseChance = 0.1;
    this.baseTypeCap = 100;

    this.baseXRotation = 20;
    this.xRotationVariability = 10;

    this.baseYRotation = 0;
    this.yRotationVariability = 360;

    this.baseZRotation = 0;
    this.zRotationVariability = 0;
  }

  rulePass(target)
  {
    this.produce(target)
    return true;
  }

  produce(target)
  {
    //Adds this rule's part to the rule's target.
    let sameTypeCounter = 0;
    for (let i = 0; i < target.children.length; i++)
    {
      if (target.children[i].name == this.basePart.name)
      {
        sameTypeCounter++;
      }
    }

    if (sameTypeCounter <= this.baseTypeCap || this.baseTypeCap < 0)
    {
      let newPart = clonePart(this.basePart);

      let xRotation = this.baseXRotation+(Math.random()*this.xRotationVariability)-(this.xRotationVariability/2);
      let yRotation = this.baseYRotation+(Math.random()*this.yRotationVariability)-(this.yRotationVariability/2);
      let zRotation = this.baseZRotation+(Math.random()*this.zRotationVariability)-(this.zRotationVariability/2);

      newPart.relativeRotation = new THREE.Euler(xRotation * (Math.PI/180), yRotation * (Math.PI/180), zRotation * (Math.PI/180));
      newPart.stickPosition = this.stickPositionLowerBound + (Math.random()*(this.stickPositionUpperBound-this.stickPositionLowerBound));
      target.addChild(newPart);
    }

  }
}

//Rule for growing a part.
//TODO: Consider making rules that adjust other factors of a part,
//like colour, rotation, relative position and stickPosition.
//If so, possibly consider rennaming GrowthRule to ModifyRule?
class GrowthRule extends Rule
{
  constructor()
  {
    super();
    this.ruleType = "growthRule";

    this.baseChance = 0.025;

    //When the rule procs, changes the length of the target by this amount
    this.lengthDelta = 0.22;
    //When the rule procs, changes the thickness of the target by this amount
    this.thicknessDelta = 0.001;
  }

  rulePass(target)
  {
    this.modify(target);
    return true;
  }

  modify(target)
  {
    //Modify this rule's target according to its rules. Growth rules
    //modify length and thickness.
    target.changeLength(this.lengthDelta);
    target.thickness += this.thicknessDelta;
    target.renderUpToDate = false;
  }
}

//Class defining a plant part.
class Part
{
  constructor()
  {
    //The part's child parts.
    this.children = [];

    //The part's rules, determines it's behaviour in growth ticks.
    this.rules = [];

    //stickPosition determines this parts' position "along" its parent part.
    //stickPositionFixed determines whether when its parent changes length,
    //whether or not it "follows" with it.
    this.stickPosition = 0.4; // 0 to 1
    this.stickPositionFixed = false;

    //relativePosition is essentially a cached location for rendering determined
    //by stickPosition. relativeRotation is generally constant and determines this
    //parts rotation relative to its parent.
    this.relativePosition = null;
    this.relativeRotation = null;

    //All parts are cylinders, which have a thickness and a length.
    //lastLength is used for adjusting relative position if this part's children
    //have stickPositionFixed.
    this.thickness = 0.5;
    this.length = 2;
    this.lastLength = this.length;

    //partID is a unique ID for this specific part. Not necesarially human readable.
    this.partID = partCount;
    partCount++;

    //name is a human readable and given name to each part type.
    //TODO: It's also used by the code in a lot of cases (especially in the ui)
    //to determine the type of part this is. Ideally this wouldn't be a string
    //as then it wouldn't change and each part type would have its own ID.
    this.name = "unnamedPart";

    //The AFrame object representing this part in the DOM.
    this.DOMObject = null;
    //Child that represents the displayed model;
    this.DisplayDOMObject = null;
    this.displayedModel = null;

    //Used for determining whether these things need to be recalculated.
    this.renderUpToDate = false;
    this.positionUpToDate = false;

    //Used for determining the display model of the part.
    this.model = new ModelReference("organic");

    //Whether or not this part is its owner plant's root, or if it's a "prototype"
    //part, whether its intended to be used as a root.
    this.isRoot = false;
  }

  addChild(child)
  {
    //Adds a child part to this part.
    this.children.push(child);
  }

  addRule(rule)
  {
    //Adds a rule to this part.
    this.rules.push(rule);
  }

  removeChildByIndex(index)
  {
    this.children.splice(index, 1);
  }

  removeRuleByIndex(index)
  {
    this.rules.splice(index, 1);
  }

  changeLength(delta)
  {
    //Changes the length of the part by delta, then updates its children's positions
    //to adjust.
    this.lastLength = this.length;
    this.length += delta;
    for (let i = 0; i < this.children.length; i++)
    {
      this.children[i].positionUpToDate = false;
      this.children[i].calculateStickPosition(this);
    }
  }

  grow()
  {
    //Procs this part's rules, as well as those of its children.
    for (let i = 0; i < this.children.length; i++)
    {
      this.children[i].grow();
    }
    for (let i = 0; i < this.rules.length; i++)
    {
      this.rules[i].ruleTick(this);
    }
  }

  calculateStickPosition(parent)
  {
    //Calculates the sticks relative position to its parent.
    if (!this.positionUpToDate)
    {
      //alert(this.partID);
      if (this.isRoot)
      {
        this.positionUpToDate = true;
        for (let i = 0; i < this.children.length; i++)
        {
          this.children[i].calculateStickPosition(this);
        }
        return;
      }
      else
      if (!this.stickPositionFixed)
      {
        this.stickPosition = this.stickPosition*(parent.lastLength/parent.length);
      }
      let heightOffset = new THREE.Vector3(0, parent.length*(this.stickPosition), 0);
      this.positionUpToDate = true;
      this.relativePosition = heightOffset;
    }
    for (let i = 0; i < this.children.length; i++)
    {
      this.children[i].calculateStickPosition(this);
    }
  }

  render(parent)
  {
    //Renders the plant in the world by checking how it needs to update itself
    //in the AFrame DOM to reflect the Part classes' state.

    if (!this.renderUpToDate)
    {
      let realPosition = this.relativePosition;//getPositionFromBottom(this.relativePosition, this.relativeRotation, this.length);
      if (this.DOMObject === null)
      {
         this.DOMObject = document.createElement("a-entity");

         this.DOMObject.setAttribute('position', { x: realPosition.x, y: realPosition.y, z: realPosition.z });
         this.DOMObject.setAttribute('rotation', { x: THREE.Math.radToDeg(this.relativeRotation.x),
           y: THREE.Math.radToDeg(this.relativeRotation.y),
           z: THREE.Math.radToDeg(this.relativeRotation.z) });

        if (parent === null)
        {
          document.getElementsByTagName("a-scene")[0].appendChild(this.DOMObject);
        }
        else
        {
          parent.DOMObject.appendChild(this.DOMObject);
        }
        this.DOMObject.object3D.position.set(realPosition.x, realPosition.y, realPosition.z);
        this.DOMObject.object3D.rotation.set(THREE.Math.radToDeg(this.relativeRotation.x), THREE.Math.radToDeg(this.relativeRotation.y), THREE.Math.radToDeg(this.relativeRotation.z));
        this.DOMObject.addEventListener('DOMContentLoaded', function () { renderChildren(); });
      }
      else
      {
        this.DOMObject.object3D.position.set(realPosition.x, realPosition.y, realPosition.z);
      //  this.DOMObject.object3D.rotation.set(THREE.Math.radToDeg(this.relativeRotation.x), THREE.Math.radToDeg(this.relativeRotation.y), THREE.Math.radToDeg(this.relativeRotation.z));
      }

      if (this.displayedModel != this.model.modelSource)
      {
          if (!(this.displayDOMObject === null || this.displayDOMObject === undefined))
          {
              this.DOMObject.removeChild(this.displayDOMObject);
          }

          this.displayDOMObject = document.createElement("a-entity");
          this.displayDOMObject.setAttribute("gltf-model", `#${this.model.modelSource}`);
          this.displayedModel = this.model.modelSource;
          this.displayDOMObject.setAttribute("scale", { x: this.thickness, y: this.length, z: this.thickness });
          this.DOMObject.appendChild(this.displayDOMObject);

      }
      this.displayDOMObject.setAttribute("scale", { x: this.thickness, y: this.length, z: this.thickness });
      this.renderUpToDate = true;
    }
    this.renderChildren();

  }

  renderChildren()
  {
    //Renders this parts' children.
    for (let i = 0; i < this.children.length; i++)
    {
      this.children[i].render(this);
    }
  }

  remove()
  {
    this.DOMObject.parentNode.removeChild(this.DOMObject);
  }

  renamePart(oldName, newName)
  {
    if (this.name === oldName)
    {
      this.name = newName;
    }

    for (let i = 0; i < this.children.length; i++)
    {
      this.children[i].renamePart(oldName, newName);
    }
  }

  updateRules(partName, newSet)
  {
    if (this.name === partName)
    {
      this.rules = newSet;
    }

    for (let i = 0; i < this.children.length; i++)
    {
      this.children[i].updateRules(partName, newSet);
    }
  }

  updateSingleRule(ruleName, newRule)
  {
    for (let i = 0; i < this.rules.length; i++)
    {
      if (this.rules[i].name === ruleName)
      {
        this.rules[i] = newRule;
      }
    }

    for (let i = 0; i < this.children.length; i++)
    {
      this.children[i].updateSingleRule(ruleName, newRule);
    }
  }

  recursiveForceRender()
  {
    //Forces this part, and all of its children to render next render step.
    for (let i = 0; i < this.children.length; i++)
    {
      this.renderUpToDate = false;
      this.children[i].recursiveForceRender();
    }
  }
}

//Class defining an entire plant.
class Plant
{
  constructor()
  {
    this.rootPart = null;
    this.renderUpToDate = false;
    this.name = "unnamedPlant"
    this.worldPosition = new THREE.Vector3(0, 0, 0);
  }

  render()
  {
    //Renders the plant in the world by updating the AFrame DOM to reflect the
    //plant's state.
    this.rootPart.calculateStickPosition(this);
    if (!this.renderUpToDate)
    {
      this.rootPart.render(null);
      this.renderUpToDate = true;
    }
  }

  grow()
  {
    //Procs rules for all of the parts in the plant, by having it start with the
    //root part outward.
    this.rootPart.grow();
    this.renderUpToDate = false;
  }

  remove()
  {
    this.rootPart.remove();
  }

  renamePart(oldName, newName)
  {
    this.rootPart.renamePart(oldName, newName);
  }

  updateRules(partName, newSet)
  {
    this.rootPart.updateRules(partName, newSet);
  }

  updateSingleRule(ruleName, newRule)
  {
    this.rootPart.updateSingleRule(ruleName, newRule);
  }
}

class PlantBlueprint
{
  //"Blueprint" or factory class for making new plants from a designated
  //base part.
  constructor(basePart)
  {
    this.basePart = basePart;
    this.name = "unnamedPlantBlueprint";
  }

  createPlant()
  {
    //Returns a new plant object with this blueprint's root part as the plant's
    //root part.
    let newPlant = new Plant();
    newPlant.rootPart = clonePart(this.basePart);
    return newPlant;
  }
}

class Garden
{
  //Garden class, stores information about the plants, parts and rules created.
  constructor()
  {
    this.plantBlueprints = [];
    this.plants = [];
    this.definedRules = [];
    this.definedParts = [];
    this.definedModels = ["cylinder", "leaf", "organic", "bell"];

  }

  addPlant(plant)
  {
    //Function for adding a plant to the garden.
    this.plants.append(plant);
  }

  clearGarden()
  {
    for (let i = 0; i < this.plants.length; i++)
    {
      this.plants[i].remove();
    }
    this.plants = [];
  }

  restartFromBlueprint(blueprint)
  {
    this.clearGarden();
    this.plants.push(blueprint.createPlant());
  }

  gardenGrowStep()
  {
    //Makes all plants proc their rules.
    for (let i = 0; i < this.plants.length; i++)
    {
      this.plants[i].grow();
    }
  }

  gardenRenderStep()
  {
    //Makes plants update their display in the AFrame DOM.
    for (let i = 0; i < this.plants.length; i++)
    {
      this.plants[i].render();
    }
  }

  updateSingleRule(ruleName, newRule)
  {
    for (let i = 0; i < this.plants.length; i++)
    {
      this.plants[i].updateSingleRule(ruleName, newRule)
    }
    for (let i = 0; i < this.definedParts.length; i++)
    {
      this.definedParts[i].updateSingleRule(ruleName, newRule)
    }
  }

  forceRender()
  {
    //Force all parts of all plants to rerender.
    for (let i = 0; i < this.plants.length; i++)
    {
      this.plants[i].renderUpToDate = false;
      this.plants[i].rootPart.recursiveForceRender();
    }
  }
}

class SimulationOptions
{
  //Encapsulates simulation tick variables in a class.
  constructor()
  {
    //Growth simulation tick variables.
    this.framesSinceLastGrowth = 0;
    this.framesPerGrowth = 10;
    //Whether or not to run growth ticks at all.
    this.growthRunning = true;
  }
}

class ModelReference
{
  //Exists to make the model used by parts to be passed by reference instead of
  //by value, meaning that all parts of the same type should (in theory) share
  //the same modelSource.
  //TODO: Come on, there _has_ to be a better way to do this.
  constructor(modelName)
  {
    this.modelSource = modelName;
  }
}

let simulation = new SimulationOptions();

//Garden variable, also used in ui.js. Sort of a master class, storing
//all information about the plants and possibly music when that gets
//implemented.
let garden = new Garden();

//Debug plant & rules
let rootPart = new Part();
rootPart.relativePosition = new THREE.Vector3(0, 0, 0);
rootPart.relativeRotation = new THREE.Euler();
rootPart.isRoot = true;
rootPart.length = 0;
rootPart.thickness = 0;
rootPart.name = "Root";
let trunkPart = new Part();
trunkPart.thickness = 0.3;
trunkPart.length = 2;
trunkPart.lastLength = 2;
trunkPart.relativePosition = new THREE.Vector3(0, 0, 0);
trunkPart.relativeRotation = new THREE.Euler();
trunkPart.name = "Trunk";
let branchPart = new Part();
branchPart.relativePosition = new THREE.Vector3();
branchPart.relativeRotation = new THREE.Euler(0, 0, 0);
branchPart.thickness = 0.1;
branchPart.length = 0.5;
branchPart.name = "Branch";

let newBranchRule = new ProductionRule(branchPart);
newBranchRule.name = "New Branch";
let newBranchRuleLowChance = new ProductionRule(branchPart);
newBranchRuleLowChance.name = "New Branch (LC)";
newBranchRuleLowChance.baseChance = 0.03;
let growTrunkRule = new GrowthRule();
growTrunkRule.name = "Grow Trunk";
let growBranchRule = new GrowthRule();
growBranchRule.name = "Grow Branch";

trunkPart.addRule(growTrunkRule);
trunkPart.addRule(newBranchRule);
branchPart.addRule(newBranchRuleLowChance);
branchPart.addRule(growBranchRule);

rootPart.children.push(trunkPart);

//Define plant and add to the garden
//let plant1 = new Plant();

//plant1.rootPart = rootPart;

garden.plantBlueprints.push(new PlantBlueprint(trunkPart));
garden.plants.push(garden.plantBlueprints[0].createPlant());
//garden.plants.push(plant1);

//Add defined rules and parts to the garden
//garden.definedParts.push(rootPart);
garden.definedParts.push(trunkPart);
garden.definedParts.push(branchPart);

garden.definedRules.push(growTrunkRule);
garden.definedRules.push(newBranchRule);
garden.definedRules.push(newBranchRuleLowChance);
garden.definedRules.push(growBranchRule);

//Define A-FRAME components.

//auto-rotate component, rotates the camera around the scene by a set speed.
//TODO: magic numbers are bad, define rotation speed in a variable?
AFRAME.registerComponent("auto-rotate", {
  tick: function() {
    let el = this.el;
    el.object3D.rotation.y += 0.005;
  }
});

//auto-render component, automatically runs gardenRenderStep and handles
//growth simulation ticks.
AFRAME.registerComponent("auto-render", {
  tick: function()
  {
    garden.gardenRenderStep();
    if (simulation.framesSinceLastGrowth >= simulation.framesPerGrowth)
    {
      garden.gardenGrowStep();
      simulation.framesSinceLastGrowth = 0;
    }
    else
    {
      if (simulation.growthRunning)
      {
        simulation.framesSinceLastGrowth++;
      }
    }
  }

})
