package com.macrojoy.zgd
{
   import com.macrojoy.zgd.elements.BasicHero;
   import com.macrojoy.zgd.interfaces.IObject;
   import flash.events.Event;
   import flash.events.KeyboardEvent;
   import flash.events.MouseEvent;
   import flash.external.ExternalInterface;
   import com.macrojoy.zgd.elements.BasicEnemy;
   
   public class UserControl
   {
      
      private static var keyMissionIsDown:Boolean;
      
      public static var keyRightCode:uint;
      
      public static var keyLeftCode:uint;
      
      private static var keyQuitIsDown:Boolean;
      
      public static var keyAttackCode:uint;
      
      private static var keyPauseIsDown:Boolean;
      
      public static var keyUpCode:uint;
      
      public static var keyDownCode:uint;
      
      private static var _hero1:BasicHero;
      
      private static var _hero2:BasicHero;
      
      public static var keyJumpCode:uint;
      
      public static var keySkillCode:uint;
      
      private static var _heroNum:uint = 2;
      
      private static var onlineRole:String = "host";
      
      public function UserControl()
      {
         super();
      }
      
      public static function stopControl(param1:BasicHero) : void
      {
         var _loc2_:uint = 0;
         var _loc3_:BasicHero = null;
         loseFocus(null);
         _loc2_ = 1;
         while(_loc2_ < 3)
         {
            _loc3_ = UserControl["_hero" + _loc2_];
            if(_loc3_ == param1)
            {
               UserControl["_hero" + _loc2_] = null;
               break;
            }
            _loc2_++;
         }
      }
      
      private static function loseFocus(param1:Event) : void
      {
         var _loc2_:uint = 0;
         var _loc3_:BasicHero = null;
         if(Global.gamePause == false)
         {
            _loc2_ = 1;
            while(_loc2_ < 3)
            {
               _loc3_ = UserControl["_hero" + _loc2_];
               if(_loc3_ != null)
               {
                  loseFocuseWho(_loc3_);
               }
               _loc2_++;
            }
            pauseHandler();
         }
      }
      
      private static function keyUpWho(param1:BasicHero, param2:uint) : void
      {
         if(param2 == 74)
         {
            param1.keyAttackIsDown = false;
            return;
         }
         if(param2 == 75)
         {
            param1.keyJumpIsDown = false;
            return;
         }
         if(param2 == 76)
         {
            param1.keySkillIsDown = false;
            return;
         }
         if(param2 == 65)
         {
            param2 = 37;
         }
         else if(param2 == 68)
         {
            param2 = 39;
         }
         else if(param2 == 87)
         {
            param2 = 38;
         }
         else if(param2 == 83)
         {
            param2 = 40;
         }
         switch(param2)
         {
            case keyLeftCode:
               param1.keyLeftIsDown = false;
               break;
            case keyRightCode:
               param1.keyRightIsDown = false;
               break;
            case keyUpCode:
               param1.keyUpIsDown = false;
               break;
            case keyDownCode:
               param1.keyDownIsDown = false;
               break;
            case keyAttackCode:
               param1.keyAttackIsDown = false;
               break;
            case keySkillCode:
               param1.keySkillIsDown = false;
               break;
            case keyJumpCode:
               param1.keyJumpIsDown = false;
               break;
            case 37:
               param1.keyLeftIsDown = false;
               break;
            case 39:
               param1.keyRightIsDown = false;
               break;
            case 38:
               param1.keyUpIsDown = false;
               break;
            case 40:
               param1.keyDownIsDown = false;
               break;
            case 90:
               param1.keyAttackIsDown = false;
               break;
            case 67:
               param1.keySkillIsDown = false;
               break;
            case 88:
               param1.keyJumpIsDown = false;
               break;
            case Data.PAUSE_CODE:
               keyPauseIsDown = false;
               break;
            case Data.QUIT_CODE:
               keyQuitIsDown = false;
               break;
            case Data.NEXT_MISSION_CODE:
               keyMissionIsDown = false;
         }
      }
      
      private static function pauseHandler() : void
      {
         var _loc1_:IObject = null;
         if(Global.gameStatus == "playing")
         {
            if(!Global.gamePause)
            {
               GameControl.pauseGame();
               UIControl.createPanel("PanelPause");
            }
            else
            {
               _loc1_ = Global.uiCTN.getChildByName("PanelPause") as IObject;
               if(_loc1_ != null)
               {
                  if(Global.uiCTN.getChildByName("PanelHelp") == null && Global.uiCTN.getChildByName("PanelOptions") == null && Global.uiCTN.getChildByName("PanelSure") == null)
                  {
                     GameControl.resumeGame();
                     _loc1_.removeSelf();
                  }
               }
            }
         }
      }
      
      public static function removeControlListener() : void
      {
         Global.stage.removeEventListener(KeyboardEvent.KEY_DOWN,keyDownHandler);
         Global.stage.removeEventListener(KeyboardEvent.KEY_UP,keyUpHandler);
         Global.stage.removeEventListener(Event.DEACTIVATE,loseFocus);
         _hero1 = null;
         _hero2 = null;
      }
      
      public static function addControlListener() : void
      {
         Global.stage.addEventListener(KeyboardEvent.KEY_DOWN,keyDownHandler);
         Global.stage.addEventListener(KeyboardEvent.KEY_UP,keyUpHandler);
         Global.stage.addEventListener(Event.DEACTIVATE,loseFocus);
         Global.stage.focus = null;
         if(ExternalInterface.available)
         {
            try
            {
               ExternalInterface.addCallback("hknRemoteDown",remoteKeyDown);
               ExternalInterface.addCallback("hknRemoteUp",remoteKeyUp);
               ExternalInterface.addCallback("hknBridgePing",bridgePing);
               ExternalInterface.addCallback("hknSetRole",setOnlineRole);
               ExternalInterface.addCallback("hknLocalDown",localKeyDown);
               ExternalInterface.addCallback("hknLocalUp",localKeyUp);
               ExternalInterface.addCallback("hknApplyRoomPause",applyRoomPause);
               ExternalInterface.addCallback("hknGetWorldSnapshot",getWorldSnapshot);
               ExternalInterface.addCallback("hknApplyWorldSnapshot",applyWorldSnapshot);
            }
            catch(error:Error)
            {
               trace("Online bridge registration failed: " + error.message);
            }
         }
      }
      
      // Host snapshot: lightweight first-stage correction only. The guest still runs
      // enemy AI and combat locally; these callbacks do NOT make combat authoritative.
      public static function getWorldSnapshot() : String
      {
         if(onlineRole != "host" || Global.gameStatus != "playing") return "";
         var data:Object = {v:1,mission:Global.currentMission,section:Global.currentSection,level:Global.gameLevel,heroes:[],enemies:[]};
         var hero:BasicHero;
         var enemy:BasicEnemy;
         var i:int;
         var list:Array = [Global.hero1,Global.hero2];
         for(i=0;i<list.length;i++)
         {
            hero=list[i] as BasicHero;
            if(hero != null) data.heroes.push({id:i+1,x:hero.myX,y:hero.myY,z:hero.myZ});
         }
         if(Global.camp3 != null)
         {
            for(i=0;i<Global.camp3.length && i<90;i++)
            {
               enemy=Global.camp3[i] as BasicEnemy;
               if(enemy != null && !enemy.toRemove)
                  data.enemies.push({id:enemy.myID,x:enemy.myX,y:enemy.myY,z:enemy.myZ});
            }
         }
         return JSON.stringify(data);
      }

      public static function applyWorldSnapshot(raw:String) : String
      {
         if(onlineRole != "guest" || Global.gameStatus != "playing") return "SKIP";
         try
         {
            var state:Object=JSON.parse(raw);
            if(state == null || state.v != 1 || state.mission != Global.currentMission || state.section != Global.currentSection || state.level != Global.gameLevel) return "STAGE_MISMATCH";
            var pos:Object;
            var h:BasicHero;
            var e:BasicEnemy;
            var i:int;
            var j:int;
            if(state.heroes is Array)
            {
               for(i=0;i<state.heroes.length;i++)
               {
                  pos=state.heroes[i];
                  h=pos.id == 1 ? Global.hero1 : (pos.id == 2 ? Global.hero2 : null);
                  if(h != null && isFinite(Number(pos.x)) && isFinite(Number(pos.y)) && isFinite(Number(pos.z)))
                  {
                     h.myX=Number(pos.x); h.myY=Number(pos.y); h.myZ=Number(pos.z);
                  }
               }
            }
            if(state.enemies is Array && Global.camp3 != null)
            {
               for(i=0;i<state.enemies.length;i++)
               {
                  pos=state.enemies[i];
                  for(j=0;j<Global.camp3.length;j++)
                  {
                     e=Global.camp3[j] as BasicEnemy;
                     if(e != null && e.myID == uint(pos.id) && isFinite(Number(pos.x)) && isFinite(Number(pos.y)) && isFinite(Number(pos.z)))
                     {
                        e.myX=Number(pos.x); e.myY=Number(pos.y); e.myZ=Number(pos.z);
                        break;
                     }
                  }
               }
            }
            return "APPLIED";
         }
         catch(error:Error) {return "ERROR";}
      }

      public static function setOnlineRole(param1:String) : String
      {
         onlineRole = param1 == "guest" ? "guest" : "host";
         return onlineRole;
      }
      
      public static function applyRoomPause(param1:Boolean) : String
      {
         if(Global.gameStatus != "playing")
         {
            return "NOT_PLAYING";
         }
         if(param1)
         {
            if(_hero1 != null)
            {
               loseFocuseWho(_hero1);
            }
            if(_hero2 != null)
            {
               loseFocuseWho(_hero2);
            }
            if(!Global.gamePause)
            {
               GameControl.pauseGame();
            }
            if(Global.uiCTN != null && Global.uiCTN.getChildByName("PanelPause") == null)
            {
               UIControl.createPanel("PanelPause");
            }
            return "PAUSED";
         }
         if(Global.gamePause)
         {
            GameControl.resumeGame();
         }
         if(Global.uiCTN != null)
         {
            var pausePanel:IObject = Global.uiCTN.getChildByName("PanelPause") as IObject;
            if(pausePanel != null)
            {
               pausePanel.removeSelf();
            }
         }
         return "PLAYING";
      }
      
      public static function bridgePing() : String
      {
         return "HKN-DUAL-READY";
      }
      
      private static function validNetworkKey(param1:uint) : Boolean
      {
         return param1 == 37 || param1 == 39 || param1 == 38 || param1 == 40 || param1 == 90 || param1 == 67 || param1 == 88 || param1 == 87 || param1 == 65 || param1 == 83 || param1 == 68 || param1 == 74 || param1 == 75 || param1 == 76;
      }
      
      public static function localKeyDown(param1:uint) : void
      {
         var hero:BasicHero = onlineRole == "guest" ? _hero2 : _hero1;
         if(hero != null && !Global.gamePause && Global.gameStatus == "playing" && validNetworkKey(param1))
         {
            keyDownWho(hero,param1);
         }
      }
      
      public static function localKeyUp(param1:uint) : void
      {
         var hero:BasicHero = onlineRole == "guest" ? _hero2 : _hero1;
         if(hero != null && validNetworkKey(param1))
         {
            keyUpWho(hero,param1);
         }
      }
      
      public static function remoteKeyDown(param1:uint) : void
      {
         var hero:BasicHero = onlineRole == "guest" ? _hero1 : _hero2;
         if(hero != null && !Global.gamePause && Global.gameStatus == "playing" && validNetworkKey(param1))
         {
            keyDownWho(hero,param1);
         }
      }
      
      public static function remoteKeyUp(param1:uint) : void
      {
         var hero:BasicHero = onlineRole == "guest" ? _hero1 : _hero2;
         if(hero != null && validNetworkKey(param1))
         {
            keyUpWho(hero,param1);
         }
      }
      
      private static function keyUpHandler(param1:KeyboardEvent) : void
      {
         if(_hero1 != null && validNetworkKey(param1.keyCode))
         {
            localKeyUp(param1.keyCode);
         }
      }
      
      public static function control(param1:BasicHero) : void
      {
         var _loc2_:uint = 0;
         var _loc3_:BasicHero = null;
         _loc2_ = 1;
         while(_loc2_ < 3)
         {
            _loc3_ = UserControl["_hero" + _loc2_];
            if(_loc3_ == null)
            {
               UserControl["_hero" + _loc2_] = param1;
               break;
            }
            _loc2_++;
         }
      }
      
      private static function keyDownWho(param1:BasicHero, param2:uint) : void
      {
         if(param2 == 74)
         {
            param1.keyAttackIsDown = true;
            return;
         }
         if(param2 == 75)
         {
            param1.keyJumpIsDown = true;
            return;
         }
         if(param2 == 76)
         {
            param1.keySkillIsDown = true;
            return;
         }
         if(param2 == 65)
         {
            param2 = 37;
         }
         else if(param2 == 68)
         {
            param2 = 39;
         }
         else if(param2 == 87)
         {
            param2 = 38;
         }
         else if(param2 == 83)
         {
            param2 = 40;
         }
         switch(param2)
         {
            case keyLeftCode:
               if(!param1.keyLeftIsDown)
               {
                  param1.pushKey("A");
                  param1.pushRollKey("A");
               }
               param1.keyLeftIsDown = true;
               break;
            case keyRightCode:
               if(!param1.keyRightIsDown)
               {
                  param1.pushKey("D");
                  param1.pushRollKey("D");
               }
               param1.keyRightIsDown = true;
               break;
            case keyUpCode:
               if(!param1.keyUpIsDown)
               {
                  param1.pushKey("W");
                  param1.pushRollKey("W");
               }
               param1.keyUpIsDown = true;
               break;
            case keyDownCode:
               if(!param1.keyDownIsDown)
               {
                  param1.pushKey("S");
                  param1.pushRollKey("S");
               }
               param1.keyDownIsDown = true;
               break;
            case keyAttackCode:
               param1.keyAttackIsDown = true;
               break;
            case keySkillCode:
               param1.keySkillIsDown = true;
               break;
            case keyJumpCode:
               param1.keyJumpIsDown = true;
               break;
            case 37:
               if(!param1.keyLeftIsDown)
               {
                  param1.pushKey("A");
                  param1.pushRollKey("A");
               }
               param1.keyLeftIsDown = true;
               break;
            case 39:
               if(!param1.keyRightIsDown)
               {
                  param1.pushKey("D");
                  param1.pushRollKey("D");
               }
               param1.keyRightIsDown = true;
               break;
            case 38:
               if(!param1.keyUpIsDown)
               {
                  param1.pushKey("W");
                  param1.pushRollKey("W");
               }
               param1.keyUpIsDown = true;
               break;
            case 40:
               if(!param1.keyDownIsDown)
               {
                  param1.pushKey("S");
                  param1.pushRollKey("S");
               }
               param1.keyDownIsDown = true;
               break;
            case 90:
               param1.keyAttackIsDown = true;
               break;
            case 67:
               param1.keySkillIsDown = true;
               break;
            case 88:
               param1.keyJumpIsDown = true;
               break;
            case Data.PAUSE_CODE:
               if(!keyPauseIsDown)
               {
                  keyPauseIsDown = true;
                  pauseHandler();
               }
               break;
            case Data.QUIT_CODE:
               if(!keyQuitIsDown)
               {
                  keyQuitIsDown = true;
                  pauseHandler();
               }
               break;
            case Data.NEXT_MISSION_CODE:
               if(Data.GAME_TESTING)
               {
                  if(!keyMissionIsDown && Global.gameStatus == "playing" && !Global.gamePause)
                  {
                     keyMissionIsDown = true;
                     GameControl.changeMisssion();
                  }
               }
         }
      }
      
      private static function mouseWheelEvt(param1:MouseEvent) : void
      {
         var _loc2_:uint = 0;
         if(!Global.gamePause)
         {
            _loc2_ = 17;
            if(param1.delta > 0)
            {
               if(Global.stage.frameRate + _loc2_ <= 35)
               {
                  Global.stage.frameRate += _loc2_;
               }
            }
            else if(param1.delta < 0)
            {
               if(Global.stage.frameRate - _loc2_ > 0)
               {
                  Global.stage.frameRate -= _loc2_;
               }
            }
         }
      }
      
      private static function keyDownHandler(param1:KeyboardEvent) : void
      {
         if(_hero1 != null && validNetworkKey(param1.keyCode))
         {
            localKeyDown(param1.keyCode);
         }
      }
      
      private static function loseFocuseWho(param1:BasicHero) : void
      {
         param1.keyLeftIsDown = false;
         param1.keyRightIsDown = false;
         param1.keyUpIsDown = false;
         param1.keyDownIsDown = false;
         param1.keyJumpIsDown = false;
         param1.keyAttackIsDown = false;
         param1.keySkillIsDown = false;
      }
   }
}

