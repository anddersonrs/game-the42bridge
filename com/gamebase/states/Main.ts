/// <reference path='../../pkframe/refs.ts' />

module GameBase
{

	export class Main extends Pk.PkState {

		enterKey:Phaser.Key;

		heroes:Pk.PkElement;
		charPadding:number = 10;

		padding:number = 20;

		init(...args:any[])
		{
			super.init(args); // if whant override init, you need this line!
			console.log('Main init', args);
		}

    	create()
    	{

    		// change state bg
            this.game.stage.backgroundColor = "#938da0";

			// prevent stop update when focus out
            this.stage.disableVisibilityChange = true;

    		// get the keyboard key to come back to menu
            this.enterKey = this.game.input.keyboard.addKey(Phaser.Keyboard.ENTER);

			// when press the key...
            this.enterKey.onDown.add(()=>{
                this.transition.change('Menu', 1111, 'text', {a:true, b:[1, 2]});  // return with some foo/bar args
            }, this);

			// set characters group / element
			this.heroes = new Pk.PkElement(this.game);

			// create heroes
			var druid = new GameBase.Druid(this.game);
			druid.create();

			var priest = new GameBase.Hero(this.game, this.game.add.sprite(0, 0, 'char2'));
			priest.energyType = E.EnergyType.MANA;
			priest.create();

			var thief = new GameBase.Hero(this.game, this.game.add.sprite(0, 0, 'char3'));
			thief.energyType = E.EnergyType.STAMINA;
			thief.create();

			var knight = new GameBase.Hero(this.game, this.game.add.sprite(0, 0, 'char4'));
			knight.energyType = E.EnergyType.STAMINA;
			knight.create();

			// add
			this.heroes.add(druid);
			this.heroes.add(priest);
			this.heroes.add(thief);
			this.heroes.add(knight);

			var i = 0;
			this.heroes.forEach((hero:GameBase.Hero)=>{
				
				// pos
				hero.x = (hero.width + this.charPadding) * i;
				hero.x += this.padding;
				hero.y = this.game.height - hero.height - this.padding;

				// start from diferents frames
				hero.animationIdle.setFrame(this.game.rnd.integerInRange(1, 5));

				i++;
			}, this);
			
			this.transition.transitionAnimation = new GameBase.Transitions.Slide(this.game);
    	}

		render()
        {
            this.game.debug.text('(Main Screen) Press [ENTER] to Menu', 35, 35);
        }

    }

}