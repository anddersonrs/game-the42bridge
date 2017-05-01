/// <reference path='../../../pkframe/refs.ts' />
/// <reference path='./Char.ts' />
 
module GameBase {
 
    export class Hero extends GameBase.Char {
        
        // ui elem
        ui:GameBase.ui.Hero;
        uiAttack:GameBase.ui.Attack;
        deadCount:GameBase.ui.DeadCount;

        identification:number = 0;

        selected:boolean = false;

        energyType:E.EnergyType = E.EnergyType.STAMINA;
        target:GameBase.Char = null;

        dieWaiting:number = 0;


        dieTime:number = 5; // qtn of turn hero will wait die
        reviveHealthPoints:number = 2; // qtn of heath when revive
        damageReduction:number = 0; // DR
        reloadEnergyQtn:number = 2; // how much on reload energy move

        static heroes:Array<GameBase.Hero> = [];

        audioOver:Phaser.Sound;
        audioDead:Phaser.Sound;
        
        selectedSprite:Phaser.Sprite;

        constructor(game, body, id)
        {
            super(game, body);
            this.ui = new GameBase.ui.Hero(this.game, this);
            this.uiAttack = new GameBase.ui.Attack(this.game, this);
            this.deadCount = new GameBase.ui.DeadCount(this.game, this);
            this.identification = id;

            GameBase.Hero.heroes.push(this);
        }

        create()
        {
            super.create();

            this.ui.create();
            this.uiAttack.create();
            this.deadCount.create();

            this.add(this.deadCount);

            // add saturation filter over ui's
            this.ui.filters = [this.saturationFilter];
            this.uiAttack.filters = [this.saturationFilter];

            // selected sprite
            this.selectedSprite = this.game.add.sprite(0, 0, 'ui-hero-'+this.identification+'-selected');
            this.add(this.selectedSprite);
            this.selectedSprite.visible = false;


            // events
            this.body.events.onInputDown.add(()=>{

                // deselect all others
                GameBase.Hero.heroes.forEach(hero => {
                    if(hero.identification != this.identification)
                    {
                        hero.selected = false;
                        hero.event.dispatch(GameBase.E.HeroEvent.OnHeroDeselect);
                    }
                });

                this.selected = true;
                this.event.dispatch(GameBase.E.HeroEvent.OnHeroSelected);
            }, this);

            this.event.add(GameBase.E.HeroEvent.OnHeroReloadClick, this.reload, this);
            this.event.add(GameBase.E.HeroEvent.OnHeroAttackClick, (target, attack)=>{
                this.attack(attack);
            }, this);

            // hero end turn
            this.event.add(GameBase.E.CharEvent.OnCharTurnMove,(t, turnMove)=>{
                
                if(turnMove)
                {
                    // this.body.inputEnabled = this.body.visible = false;
                    this.saturationFilter.uniforms.gray.value = 0.8;
                }else{
                    this.saturationFilter.uniforms.gray.value = 0.0;
                    // this.body.inputEnabled = this.body.visible = true;
                }
            }, this);


            // attack resolve handler
            this.event.add(GameBase.E.AttackEvent.OnAttackResolve, (e, enemy, damage, damageType)=>{

                this.resolveAttack(enemy, damage, damageType);

            }, this);

            this.event.add(GameBase.E.HeroEvent.OnHeroSelected, this.heroSelectd, this);
            this.event.add(GameBase.E.HeroEvent.OnHeroDeselect, this.heroDeselect, this);

            this.body.events.onInputOver.add(this.inputOver, this);
            this.body.events.onInputOut.add(this.inputOut, this);

            this.event.add(GameBase.E.HeroEvent.OnHeroDie, this.playDeadAnimation, this);
            this.event.add(GameBase.E.HeroEvent.OnHeroRevive, this.playReviveAnimation, this);

            this.updatePosition();


            // audio
            this.audioOver = this.game.add.audio('a-hero-selected');
            this.audioDead = this.game.add.audio('a-char'+this.identification+'-dead');
        }

        updatePosition()
        {
            this.selectedSprite.y = this.body.height - this.selectedSprite.height + 11;
        }

        setBody(body:Phaser.Sprite)
        {
            super.setBody(body);

            // mouse over check
            this.body.inputEnabled = true;
        }

        inputOut()
        {
            if(!this.selected)
                this.selectedSprite.visible = false;
            //
        }

        inputOver()
        {
            this.selectedSprite.visible = true;

            this.audioOver.play();
        }

        heroDeselect()
        {
            this.selectedSprite.visible = false;
        }

        heroSelectd()
        {
            this.selectedSprite.visible = true;
        }

        die()
        {
            // make sure hero is realy dead
            if(this.ui.getHealth())
                this.ui.removeHealth(this.healthMax);
            //

            // set turn move
            if(!this.turnMove)
                this.setTurnMove(true);
            //

            // play die animation 
            // this.playDeadAnimation();
            // ...

            // qtn of turn hero will wait die
            this.dieWaiting += this.dieTime;

            this.alive = false;

            console.log('['+this.name+'] DIE.. waiting for ['+this.dieTime+'] turns for revive!');

            // dispatch die event
            this.event.dispatch(GameBase.E.HeroEvent.OnHeroDie);
        }

        playReviveAnimation()
        {
            // stop current animation
            this.currentAnimation.animation.stop();

            // hide dead count
            this.deadCount.hide();

            // change animation
            this.playAnimation('iddle');
            this.currentAnimation.animation.play();

            // reset tint effect
            this.currentAnimation.sprite.tint = 0xffffff;

            // create revive aura
            var reviveAura:GameBase.ui.ReviveAura = new GameBase.ui.ReviveAura(this.game, this);
            reviveAura.create();

            reviveAura.show();

            // "des"hide
            this.currentAnimation.sprite.alpha = 0;
            this.addTween(this.currentAnimation.sprite).to(
                {
                    alpha:1
                },
                300,
                Phaser.Easing.Default,
                true
            ).onComplete.add(()=>{
                console.log('end show revived hero')
            }, this);
            

        }

        playDeadAnimation()
        {
            // stop current animation
            this.currentAnimation.animation.stop();

            // play sound 
            this.audioDead.play();

            // tint to black
            var step = {v:0, rv:100};
            var t:Phaser.Tween = this.addTween(step).to(
                {
                    v:100,
                    rv:0
                },
                300,
                Phaser.Easing.Default,
                true
            );

            var startColor = 0xffffff;
            var endColor = 0x000000;

            // this.currentAnimation.sprite.blendMode = PIXI.blendModes.ADD;
            t.onUpdateCallback(()=>{
                this.currentAnimation.sprite.tint = Phaser.Color.interpolateColor(startColor, endColor,100, step.v);
            }, this);

            t.onComplete.add(()=>{
                this.currentAnimation.sprite.tint = endColor; // bug fix
                
                // alpha to 0
                this.addTween(this.currentAnimation.sprite).to(
                    {
                        alpha:0
                    },
                    300,
                    Phaser.Easing.Default,
                    true
                ).onComplete.add(()=>{
                    // change to dead animation
                    this.playAnimation('dead');

                    // show dead animation
                    this.addTween(this.currentAnimation.sprite).from(
                        {
                            alpha:0
                        },
                        300,
                        Phaser.Easing.Default,
                        true
                    ).onComplete.add(()=>{
                        // end... (?)
                        // show dead counter
                        this.deadCount.show();
                    }, this);
                    
                }, this);
                
            }, this);

        }

        // if die, wait for 2 turns and return with 2 health points
        dieResolve()
        {
            // count
            this.dieWaiting--;

            if(this.dieWaiting <= 0)
            {
                this.revive();
                return
            }
            

            

            this.event.dispatch(GameBase.E.HeroEvent.OnHeroDieResolve, this);

        }

        revive()
        {
            console.log('['+this.name+'] revive with ['+this.reviveHealthPoints+'] health points')

            this.setTurnMove(false);
            this.ui.addHealth(this.reviveHealthPoints);

            this.alive = true;

            this.event.dispatch(GameBase.E.HeroEvent.OnHeroRevive);
        }
        
        attack(attack:GameBase.Attack)
        {
            // check turn move
            if(this.turnMove)
                return;
            //
            
            // check target
            if(!this.target)
                return;
            //
            
            this.target.event.dispatch(GameBase.E.AttackEvent.OnAttackResolve, this, attack);

            // remove attack energy
            this.ui.removeEnergy(attack.energyCost);

            this.setTurnMove(true);

            // play attack animation
            this.playAttack(attack, <GameBase.Enemy>this.target);
        }

        playAttack(attack:GameBase.Attack, enemy:GameBase.Enemy)
        {
            // play hero attack
            // @todo

            // call move/attack events
            this.event.dispatch(GameBase.E.HeroEvent.OnHeroMove);
            this.event.dispatch(GameBase.E.HeroEvent.OnHeroAttack, attack, this.target);
        }


        resolveAttack(enemy:GameBase.Enemy, damage:number, damageType:number)
        {
            // cause damage
            console.log('enemy['+enemy.name+'] attack [' + this.name + ']');
            
            switch(damageType)
            {
                case GameBase.E.AttackType.HEATH:
                    console.log('cause ['+damage+'] damage on [health]');
                    this.ui.removeHealth(damage);
                    break;

                case GameBase.E.AttackType.ENERGY:
                    console.log('cause ['+damage+'] damage on [energy]');
                    this.ui.removeEnergy(damage);
                    break;
            }

            // if has no health points
            if(!this.ui.getHealth())
                this.die();
            //
            
        }

        reload()
        {
            // check turn move
            if(this.turnMove)
                return;
            //

            // reload energy
            this.ui.addEnergy(this.reloadEnergyQtn);

            this.setTurnMove(true);


            // call move/attack events
            this.event.dispatch(GameBase.E.HeroEvent.OnHeroMove);
            this.event.dispatch(GameBase.E.HeroEvent.OnHeroReload);
        }

    }

    export module E
    {
        export enum EnergyType
        {
            STAMINA,
            MANA
        }

        export enum AttributeType
        {
            STAMINA,
            MANA,
            HEALTH
        }

        export module HeroEvent
        {
            export const OnHeroSelected:string 	= "OnHeroSelected";
            export const OnHeroDeselect:string 	= "OnHeroDeselect";
            export const OnHeroMove:string 	    = "OnHeroMove";
            export const OnHeroRevive:string 	    = "OnHeroRevive";
            export const OnHeroDie:string 	    = "OnHeroDie";
            export const OnHeroDieResolve:string 	    = "OnHeroDieResolve";
            export const OnHeroAttackClick:string 	= "OnHeroAttackClick";
            export const OnHeroReloadClick:string 	= "OnHeroReloadClick";
            export const OnHeroAttack:string 	= "OnHeroAttack";
            export const OnHeroReload:string 	= "OnHeroReload";

        }
    }
} 