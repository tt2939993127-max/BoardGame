## ADDED Requirements

### Requirement: Mage Wars Config Package
The Mage Wars runtime SHALL provide a strict JSON `GameConfigPackage` for apprentice-mode static facts before expanding beyond the foundation runtime.

#### Scenario: Apprentice configuration package loads
- **GIVEN** the Mage Wars apprentice configuration JSON exists
- **WHEN** the shared game-config loader reads the package
- **THEN** the package MUST validate successfully as strict JSON
- **AND** it MUST materialize objects for apprentice mages, apprentice spell cards, apprentice arena zones, dice, tokens, decks, and official asset refs

#### Scenario: Spellbook package matches current apprentice source
- **GIVEN** `domain/data/apprenticeSpellbooks.ts` remains the migration comparison source
- **WHEN** tests compare the JSON package decks against the TypeScript source
- **THEN** every apprentice mage spellbook MUST have the same expanded card count
- **AND** each configured spellbook entry MUST point to an existing configured spell card object

#### Scenario: Card assets stay frame-addressable
- **GIVEN** the 91 apprentice spell cards are configured
- **WHEN** a card object declares its asset references
- **THEN** each card MUST reference an official atlas frame asset
- **AND** the frame reference MUST map to the existing Mage Wars spell atlas config rather than a temp crop

#### Scenario: Status token removal costs are data-addressable
- **GIVEN** Mage Wars status token objects are configured
- **WHEN** runtime code queries burn, daze, rot, weak, cripple, sleep, or stun token facts
- **THEN** the package MUST expose rule-book removal cost data or creature-level removal cost rules for those tokens
- **AND** guard markers MUST NOT be exposed as payable removal-cost status tokens

### Requirement: Mage Wars Config Package Migration Safety
The Mage Wars implementation SHALL migrate from current TypeScript/static JSON surfaces to `GameConfigPackage` incrementally without creating unsynchronized review-only data.

#### Scenario: Configuration review table is same-source
- **GIVEN** a Mage Wars configuration review table is generated
- **WHEN** the table displays card or mage fields
- **THEN** the table MUST be generated from the materialized `GameConfigPackage`
- **AND** it MUST NOT use a separately maintained display-only dataset

#### Scenario: Runtime migration keeps existing foundation valid
- **GIVEN** the foundation runtime is already playable
- **WHEN** a runtime query is switched to the configuration package
- **THEN** tests MUST compare the new package-backed result against the previous TypeScript or atlas source
- **AND** the change MUST NOT remove the comparison source until the migrated query is proven equivalent

#### Scenario: Cripple escape check consumes configured status facts
- **GIVEN** a current player's creature has a cripple status token
- **WHEN** that creature's action phase ends and the effect die result is 7 or higher
- **THEN** the runtime MUST emit a status-token removal event for that creature's cripple token
- **AND** an effect die result of 6 or lower MUST leave the cripple token in place
- **AND** opposing creatures MUST NOT have their cripple tokens removed by the current player's phase exit

#### Scenario: Stun action-end removal consumes configured status facts
- **GIVEN** the current player's mage and owned creatures have stun status tokens
- **AND** an opposing creature also has a stun status token
- **WHEN** the current player's creature action phase ends
- **THEN** the runtime MUST emit status-token removal events for the current player's mage and owned creatures
- **AND** those removal events MUST remove all stun token layers from the affected current-player entities
- **AND** opposing creatures MUST NOT have their stun tokens removed by the current player's phase exit

#### Scenario: Rot upkeep damage consumes configured status facts
- **GIVEN** mages and arena objects have rot status tokens
- **WHEN** the upkeep phase begins
- **THEN** each affected mage MUST take 1 direct damage per rot token
- **AND** each living arena object MUST take 1 direct damage per rot token
- **AND** nonliving arena objects MUST NOT take upkeep rot damage
- **AND** rot tokens MUST remain after the upkeep damage is applied

#### Scenario: Burn upkeep tick consumes configured status facts
- **GIVEN** mages and arena objects have burn status tokens
- **WHEN** the upkeep phase begins
- **THEN** the runtime MUST roll one attack die per burn token
- **AND** non-blank burn rolls MUST deal direct damage to the affected target
- **AND** blank burn rolls MUST remove the corresponding burn token
- **AND** burn tokens whose rolls are not blank MUST remain after the upkeep tick

#### Scenario: Cannot-burn trait blocks burn token placement
- **GIVEN** an arena object has a cannot-burn or incorporeal trait
- **WHEN** a fire attack effect would place burn status tokens on that object
- **THEN** the runtime MUST NOT place burn status tokens on that object
- **AND** the attack damage MUST still resolve through the normal attack damage path

#### Scenario: Sleep damage replacement consumes configured status facts
- **GIVEN** an arena object has sleep status tokens
- **WHEN** that object takes actual damage
- **THEN** the runtime MUST emit status-token removal events for the sleep tokens
- **AND** it MUST emit status-token placement events for the same amount of daze tokens
- **AND** zero actual damage MUST NOT replace sleep with daze

#### Scenario: Priestess quick restoration consumes status removal costs
- **GIVEN** the Priestess apprentice has the quick restoration mage ability configured
- **AND** a target creature has one or more fixed-cost status tokens of the same type
- **WHEN** the Priestess uses quick restoration during a quickcast window and pays the full same-name removal cost
- **THEN** the runtime MUST emit a mage ability resolution event
- **AND** it MUST emit status-token removal events that remove all same-name token layers from the target creature
- **AND** it MUST spend the Priestess quickcast marker and mana
- **AND** it MUST NOT move any spell card into the prepared spell area or discard pile

#### Scenario: Priestess standard restoration consumes multiple removal cost rules
- **GIVEN** the Priestess apprentice has the standard restoration mage ability configured
- **AND** a target creature has multiple removable status token types
- **WHEN** the Priestess uses standard restoration during a creature action and pays the full removal cost for all selected status types
- **THEN** the runtime MUST emit a mage ability resolution event
- **AND** it MUST emit status-token removal events for every selected status token type
- **AND** fixed-cost statuses MUST cost fixed removal cost multiplied by current same-name layers
- **AND** sleep MUST cost the target creature's configured spell level multiplied by current sleep layers
- **AND** it MUST spend the Priestess action marker and mana
- **AND** it MUST NOT move any spell card into the prepared spell area or discard pile

#### Scenario: Daze defense die penalty consumes configured status facts
- **GIVEN** an arena object has a defense profile and daze status tokens
- **WHEN** its owner rolls that object's defense as a reaction during a creature action
- **THEN** the runtime MUST emit an arena-object defense roll event
- **AND** the event MUST expose the raw effect die, configured daze modifier, modified effect die, target defense number, and success result
- **AND** each daze token MUST apply the configured defense die penalty
- **AND** the defender owner MUST be able to roll defense even when they are not the active player

#### Scenario: Stun paralyze rule disables arena object defense
- **GIVEN** an arena object has a defense profile and stun status tokens
- **WHEN** its owner attempts to roll that object's defense
- **THEN** validation MUST reject the defense command
- **AND** the rejection MUST be based on the configured stun paralyze rule rather than a separate hardcoded defense rule

#### Scenario: Cripple restrained rule penalizes arena object defense
- **GIVEN** an arena creature has a defense profile and cripple status tokens
- **WHEN** its owner rolls that object's defense as a reaction during a creature action
- **THEN** the runtime MUST emit an arena-object defense roll event
- **AND** the event MUST apply the configured restrained defense die penalty
- **AND** that restrained penalty MUST apply once while the object is crippled, not once per token layer

#### Scenario: Guard marker intercepts same-zone melee object attacks
- **GIVEN** a ready arena creature declares a melee object attack in its current zone
- **AND** the same zone contains an enemy guarding creature that can protect the zone
- **WHEN** the attacker targets an enemy mage or enemy non-guarding arena object
- **THEN** validation MUST reject the attack as requiring guard interception
- **AND** targeting an enemy object with a guard marker MUST remain valid
- **AND** ranged object attacks and spell attacks MUST NOT use this guard interception restriction

#### Scenario: Guard marker is removed after melee attacks target the guard
- **GIVEN** an enemy arena object has a guard marker
- **WHEN** a melee arena-object attack targets that guarding object
- **THEN** the runtime MUST emit a guard-removal event for that object
- **AND** the target object's guard marker MUST be removed after the attack resolves
- **AND** a daze miss or otherwise failed attack MUST still remove the guard marker
- **AND** removing the guard marker MUST NOT spend the target object's action marker

#### Scenario: Ready arena creatures can guard with their own action marker
- **GIVEN** the current player controls a ready arena creature
- **WHEN** that player declares guard for the arena creature
- **THEN** the runtime MUST emit a guard-gained event for that creature
- **AND** the creature MUST gain a guard marker and spend its own action marker
- **AND** the controlling mage's action marker MUST NOT be required or spent by the creature guard action

#### Scenario: Guarded creatures surface voluntary counterstrike opportunities
- **GIVEN** a guarding enemy creature has a quick melee attack profile
- **WHEN** it is targeted by a melee arena-object attack
- **THEN** the runtime MUST emit a counterstrike-available event before the guard marker is removed
- **AND** the runtime MUST NOT automatically resolve the counterstrike attack
- **AND** daze misses MUST still surface the counterstrike opportunity
- **AND** ranged attacks, paralyzed defenders, and defenders without a quick melee attack profile MUST NOT surface that counterstrike opportunity

#### Scenario: Counterstrike opportunity can be passed
- **GIVEN** a counterstrike-available event has queued a defender choice
- **WHEN** the defender chooses to pass
- **THEN** the runtime MUST close the interaction
- **AND** it MUST NOT emit an arena-object attack event for the defending creature

#### Scenario: Selected counterstrike resolves without spending the defender action
- **GIVEN** a counterstrike-available event has queued a defender choice
- **WHEN** the defender chooses to counterstrike
- **THEN** the runtime MUST resolve the defending creature's quick melee attack against the original attacker
- **AND** the counterstrike attack MUST NOT spend the defending creature's action marker
- **AND** the counterstrike attack MUST NOT emit another counterstrike-available event

#### Scenario: Arena object defense is chosen before attack dice
- **GIVEN** an arena object attack targets an enemy arena object with a valid defense profile
- **WHEN** the attack is declared
- **THEN** the runtime MUST emit a defense-available event before any arena-object attack dice or damage events
- **AND** the defender owner MUST receive a simple-choice interaction for one available defense or pass
- **AND** the attacker's action marker MUST be spent when the defense window opens

#### Scenario: Arena object defense can be passed
- **GIVEN** a defense-available event has queued a defender choice
- **WHEN** the defender chooses to pass
- **THEN** the runtime MUST close the interaction
- **AND** it MUST continue resolving the original attack without spending the attacker action a second time

#### Scenario: Successful arena object defense evades attack damage
- **GIVEN** a defense-available event has queued a defender choice
- **WHEN** the defender chooses a defense and the modified effect die meets or exceeds the defense number
- **THEN** the runtime MUST emit an arena-object defense roll event
- **AND** it MUST emit an attack-missed event for that defense
- **AND** it MUST NOT emit arena-object attack dice or damage events for that incoming attack

#### Scenario: Failed arena object defense continues attack damage
- **GIVEN** a defense-available event has queued a defender choice
- **WHEN** the defender chooses a defense and the modified effect die is below the defense number
- **THEN** the runtime MUST emit an arena-object defense roll event
- **AND** it MUST continue resolving the original attack without opening a second defense window

#### Scenario: One-use arena object defense cools down until reset
- **GIVEN** an arena object has a `1x` defense profile
- **AND** that defense profile has already been used this round
- **WHEN** another arena object attack targets that defender before its owner's next reset
- **THEN** the runtime MUST NOT emit a defense-available event for the spent profile
- **AND** direct defense commands for that spent profile MUST be rejected
- **AND** the owner's next action-readiness reset MUST make that profile available again

#### Scenario: Unavoidable arena object attacks skip defense
- **GIVEN** an arena object attack has the unavoidable trait
- **AND** the target arena object has a defense profile
- **WHEN** the attack is declared
- **THEN** the runtime MUST NOT emit a defense-available event
- **AND** it MUST resolve the attack normally

#### Scenario: Force Push incantation pushes a creature one zone
- **GIVEN** an apprentice mage has prepared a Force Push spell card from its configured spellbook
- **WHEN** that mage casts Force Push on a target creature and chooses an adjacent destination zone
- **THEN** the runtime MUST emit a spell-push-resolved event using the configured Force Push ability id
- **AND** the target creature MUST move from its current zone to the chosen destination zone
- **AND** Force Push MUST reject missing destinations, non-adjacent destinations, and mage targets
#### Scenario: Teleport incantation moves a creature by distance-paid X cost
- **GIVEN** an apprentice mage has prepared the Teleport spell card from its configured spellbook
- **WHEN** that mage casts Teleport on a target creature and chooses a legal target zone
- **THEN** the runtime MUST emit a spell-teleport-resolved event using the configured Teleport ability id
- **AND** the target creature MUST move from its current zone to the chosen target zone without spending that creature's action marker
- **AND** Teleport MUST charge at least 3 mana and otherwise 3 mana per zone of distance from the creature's current zone to the target zone
- **AND** Teleport MUST reject missing target zones, mage targets, non-creature objects, mismatched X costs, and out-of-range targets or target zones
#### Scenario: Plain creature spell summons a configured arena object
- **GIVEN** an apprentice mage has prepared a plain creature spell card with no extra rules text beyond configured stats and attack line
- **WHEN** that mage casts the creature spell into a legal zone
- **THEN** the runtime MUST emit an arena-object-summoned event using the configured spell card fields
- **AND** the summoned object MUST preserve the configured name, life, armor, source card id, source object id, zone, and attack/trait line
- **AND** nonliving or mental-immune traits present in that configured attack/trait line MUST remain available to later spell target validation and status filtering
- **AND** the summon MUST spend the caster's action track without spending the summoned creature's future action marker

#### Scenario: Configured creature attack effects place status tokens
- **GIVEN** an apprentice mage has summoned a configured creature whose attack line includes an effect-die status result
- **WHEN** that creature attacks a legal living arena object target and the effect die meets the configured threshold
- **THEN** the runtime MUST resolve the configured attack profile from the summoned object's attack/trait line
- **AND** it MUST place the configured status token on the target object using the creature attack ability id
- **AND** it MUST keep code-required creature cards with unimplemented activation, movement, immunity, or special-action rules marked as needing code support

#### Scenario: Darkfenne Bat preserves flying and rot attack
- **GIVEN** an apprentice Warlock has prepared Darkfenne Bat from configured spell card `2825`
- **WHEN** that mage summons Darkfenne Bat into a legal zone and pays 5 mana
- **THEN** the summoned arena object MUST preserve its configured name, source card id, life, armor, and "致病噬咬：快速近战 2 骰，效果骰 9+=腐化；飞行" attack / trait line
- **WHEN** that Darkfenne Bat attacks a living arena object and the effect die is 9 or higher
- **THEN** the runtime MUST place one rot token using the configured Darkfenne Bat attack ability id
- **AND** attack spells with an anti-flying modifier such as Jet Stream MUST be able to consume the Bat's printed flying trait
- **AND** flight movement, hindrance, walls, full twelve-zone movement, elusiveness, other flying creatures, and UI dice display MUST remain outside this slice

#### Scenario: Mana drain attacks remove mana from the target controller once per attack action
- **GIVEN** an apprentice mage has summoned a configured creature whose attack line includes `法力流失+X`
- **WHEN** that creature's arena-object attack deals actual damage to an enemy creature
- **THEN** the runtime MUST emit a mana-drained event for the damaged creature's controller
- **AND** the mana-drained event MUST cap the removed mana at the controller's current mana
- **AND** multi-strike attacks MUST apply mana drain only during the first strike of that attack action
- **AND** mana-transfer effects and unsupported mana-drain cards MUST remain marked as needing code support until their own rule slices are implemented

#### Scenario: Mage-attached weapon equipment attacks through the mage action track
- **GIVEN** an apprentice mage has cast a supported weapon equipment spell such as Arcane Staff or Asyra Staff onto itself
- **WHEN** that mage declares an equipment attack during the creature action phase
- **THEN** the runtime MUST resolve the selected attack profile from the attached equipment object's configured attack line
- **AND** the attack MUST spend the attached mage's action marker rather than requiring or spending an independent equipment action marker
- **AND** Arcane Staff attacks MUST apply their printed range and mana-drain effects
- **AND** Asyra Staff attacks MUST apply their printed nonliving bonus and daze / stun effect-die thresholds
- **AND** unsupported weapon equipment such as Lash of Hellfire, Beaststaff, defensive bracers, spellbind equipment, reflect-damage equipment, equipment slot limits, class restrictions, and complete equipment UI MUST remain outside this slice

#### Scenario: Arena object healing ability rolls healing dice and spends object action
- **GIVEN** an apprentice mage controls a ready Asyran Cleric arena object
- **WHEN** that cleric uses Healing Light on a living arena object within range 0-1
- **THEN** the runtime MUST emit an arena-object ability resolution event
- **AND** it MUST emit a spell-healing-rolled event for source spell card `2811`
- **AND** it MUST roll one healing die for that healing ability
- **AND** actual healing MUST be capped by the target object's current damage
- **AND** the cleric's action marker MUST be spent
- **AND** nonliving targets, out-of-range targets, and wrong-source arena objects MUST be rejected
- **AND** other object healing abilities MUST remain marked as needing code support until their own rule slices are implemented

#### Scenario: Grey Angel redemption sacrifice heals any living creature and destroys the source
- **GIVEN** an apprentice mage controls a ready Grey Angel arena object
- **WHEN** that Grey Angel uses Redemption Sacrifice on any living arena object
- **THEN** the runtime MUST emit an arena-object ability resolution event
- **AND** it MUST emit a spell-healing-rolled event for source spell card `2907`
- **AND** it MUST roll six healing dice for that healing ability
- **AND** actual healing MUST be capped by the target object's current damage
- **AND** it MUST emit an arena-object defeated event for the Grey Angel after healing resolves
- **AND** nonliving targets and wrong-source arena objects MUST be rejected
- **AND** flight movement implications and other object healing abilities MUST remain marked as needing code support until their own rule slices are implemented

#### Scenario: Passive configured creatures preserve currently supported combat traits
- **GIVEN** an apprentice mage has prepared a passive creature spell whose card text adds no extra executable rule beyond configured stats, attacks, defense, armor, pierce, or damage-type adjustments
- **WHEN** that mage casts the creature spell into a legal zone
- **THEN** the runtime MUST summon the creature using the configured card fields
- **AND** the summoned object MUST preserve its configured life, armor, source card id, source object id, and attack/trait line
- **AND** damage-type adjustments, pierce, armor, and defense profiles in that attack/trait line MUST remain consumable by the existing combat pipeline
- **AND** creature cards with unimplemented active abilities, movement traits, special actions, immunity edge cases, or upkeep behavior MUST remain marked as needing code support

#### Scenario: Elemental and combat-profile creatures preserve currently supported traits
- **GIVEN** an apprentice mage has prepared a creature spell whose current card text is expressible through configured stats, attacks, armor, pierce, unavoidable attacks, damage-type adjustment, damage-type immunity, or burn attack effects
- **WHEN** that mage casts the creature spell into a legal zone
- **THEN** the runtime MUST summon the creature using the configured card fields
- **AND** the summoned object MUST preserve its configured life, armor, source card id, source object id, and attack/trait line
- **AND** fire immunity, fire or frost adjustment, lightning adjustment, pierce, unavoidable attacks, and burn effect-die text in that attack/trait line MUST remain consumable by the existing combat pipeline
- **AND** unresolved expansion keywords such as Defrost MUST remain descriptive field text until the corresponding expansion rule is implemented
- **AND** creature cards with unimplemented healing actions, mana drain, flight movement implications, hindrance, elusiveness, upkeep auras, or other special actions MUST remain marked as needing code support

#### Scenario: Damage type adjustments modify attack and effect dice
- **GIVEN** a spell attack or arena-object attack has one or more configured damage types
- **AND** the target has matching damage-type adjustment traits such as `火焰-2` or `闪电+2`
- **WHEN** the attack rolls attack dice and an effect die
- **THEN** the runtime MUST modify the number of attack dice by the matching damage-type adjustment total
- **AND** the runtime MUST modify the effect die result by the same adjustment total while preserving the raw effect die result
- **AND** the attack MUST still roll at least one attack die unless a later immunity rule cancels the attack entirely

#### Scenario: Damage type immunity cancels matching attack resolution
- **GIVEN** a spell attack or arena-object attack has one or more configured damage types
- **AND** an arena object target has a matching damage-type immunity trait such as `火焰免疫` or `闪电免疫`
- **WHEN** a player validates a targeted attack spell against that immune object target
- **THEN** validation MUST reject that target as immune to the attack damage type
- **WHEN** an area attack spell or arena-object attack resolves against that immune object target
- **THEN** the runtime MUST treat the attack as ineffective against that target
- **AND** it MUST NOT roll attack dice or an effect die for the immune target
- **AND** it MUST NOT apply damage, status tokens, or attack effects to the immune target
- **AND** arena-object attacks MUST still spend the attacker's action marker and MUST report the miss as damage-type immunity, not as daze or defense evasion

#### Scenario: Blue Gremlin paid activation grants swift teleport movement
- **GIVEN** an apprentice Wizard controls a ready Blue Gremlin arena object
- **WHEN** the Wizard pays 1 mana to use Blue Gremlin's activation during the creature action phase
- **THEN** the runtime MUST emit an arena-object ability resolution event
- **AND** the player MUST spend 1 mana without spending the Blue Gremlin action marker
- **WHEN** that Blue Gremlin performs its first legal adjacent move during the same creature action phase
- **THEN** the move MUST be recorded as teleport movement with no action cost
- **AND** later moves in the same creature action phase MUST use normal action cost
- **AND** the swift / teleport temporary facts MUST be cleared when that creature action phase ends

#### Scenario: Slow trait cancels swift free movement without cancelling teleport movement
- **GIVEN** an arena creature has a slow trait and temporary swift / teleport movement facts
- **WHEN** that creature performs a legal adjacent move during its creature action phase
- **THEN** the move MUST still be recorded as teleport movement when the teleport fact is active
- **AND** the move MUST use normal action cost instead of the swift free-move cost
- **AND** the creature's action marker MUST be spent by that move

#### Scenario: Printed swift creatures get one free move before spending action
- **GIVEN** an arena creature has a printed swift trait and no slow trait
- **WHEN** that creature performs its first legal adjacent move during its creature action phase
- **THEN** the move MUST use no action cost
- **AND** the creature's action marker MUST remain ready
- **WHEN** that same creature performs a later legal adjacent move during the same creature action phase
- **THEN** the later move MUST spend the creature's action marker
- **AND** the printed swift free-move marker MUST be cleared when that creature action phase ends

#### Scenario: Thunderift Falcon preserves flying and printed swift
- **GIVEN** an apprentice Beastmaster has prepared Thunderift Falcon from configured spell card `2820`
- **WHEN** that mage summons Thunderift Falcon into a legal zone and pays 6 mana
- **THEN** the summoned arena object MUST preserve its configured name, source card id, life, armor, and `剃刀鸟喙：快速近战 3 骰；飞行；迅捷` attack / trait line
- **WHEN** that Thunderift Falcon performs its first legal normal adjacent move during its creature action phase
- **THEN** the move MUST use no action cost through the printed swift owner
- **AND** attack spells with an anti-flying modifier such as Jet Stream MUST be able to consume the Falcon's printed flying trait
- **AND** flight movement, hindrance, walls, full twelve-zone movement, elusiveness, other flying creatures, and UI dice display MUST remain outside this slice

#### Scenario: Charge trait modifies the next melee attack after a normal move
- **GIVEN** an arena creature has a printed charge trait such as `冲锋+X`
- **WHEN** that creature performs a normal adjacent move during its creature action phase
- **THEN** the move MUST mark a post-move quick-action and charge window for that creature
- **AND** that creature MUST be able to immediately declare a quick melee attack even if the normal move spent its action marker
- **AND** that next quick melee attack MUST add X attack dice from the charge trait
- **AND** the charge trait MUST NOT modify the attack effect die result
- **AND** teleport movement MUST NOT mark a charge window
- **AND** the post-move quick-action and charge window MUST clear after the attack resolves or when the creature action phase exits
- **AND** spell-granted charge effects such as Charge On MUST remain marked as needing code support until a dedicated spell-granted trait slice is implemented

#### Scenario: Highland Unicorn preserves regeneration aura and charge
- **GIVEN** an apprentice mage has summoned Highland Unicorn from configured spell card `2814`
- **WHEN** upkeep resolves for damaged living arena objects
- **THEN** Highland Unicorn MUST regenerate using its printed `重生2`
- **AND** friendly living creatures in the same zone MUST receive the printed `重生1` aura
- **AND** multiple regeneration sources MUST use the highest applicable value rather than stacking lower values
- **WHEN** Highland Unicorn performs a normal adjacent move and immediately declares its printed quick melee attack
- **THEN** that attack MUST add two attack dice from `冲锋+2`
- **AND** the charge bonus MUST NOT modify the attack effect die result
- **AND** Charge On, flying, elusiveness, hindrance, walls, other auras, enchantment-granted regeneration, and UI dice display MUST remain outside this slice

#### Scenario: Charge On grants swift and charge until phase end
- **GIVEN** an apprentice mage has prepared Charge On from configured spell card `3407`
- **AND** a target corporeal creature is within range
- **WHEN** that mage casts Charge On on that creature and pays 4 mana
- **THEN** the runtime MUST emit a temporary-traits-gained event using the configured Charge On ability id
- **AND** the target creature MUST gain temporary swift and charge+1 facts
- **WHEN** that creature performs a normal adjacent move and immediately declares a quick melee attack
- **THEN** that attack MUST add one attack die from the Charge On charge bonus
- **AND** the Charge On bonus MUST NOT modify the attack effect die result
- **AND** the temporary swift and charge facts MUST clear when the creature action phase exits
- **AND** flying, elusiveness, hindrance, walls, other incantations, and UI dice display MUST remain outside this slice

#### Scenario: Call of the Wild grants temporary melee dice to friendly animals
- **GIVEN** an apprentice Beastmaster has prepared Call of the Wild from configured spell card `3417`
- **AND** friendly and enemy arena creatures exist in the arena
- **WHEN** that mage casts Call of the Wild and pays 4 mana
- **THEN** friendly animal creatures MUST gain a temporary melee dice modifier of +1
- **AND** friendly non-animal creatures and enemy animal creatures MUST NOT gain that modifier
- **WHEN** an affected friendly animal declares a melee arena-object attack
- **THEN** that attack MUST add one attack die from the Call of the Wild modifier
- **AND** ranged attacks from the same creature MUST NOT receive the modifier
- **AND** the temporary melee dice modifier MUST clear when the creature action phase exits
- **AND** other temporary combat incantations, enchantment or equipment-granted melee bonuses, hindrance, walls, and UI dice display MUST remain outside this slice

#### Scenario: Bloodstrike grants vampiric pierce to the target creature next melee attack
- **GIVEN** an apprentice Warlock has prepared Bloodstrike from configured spell card `3404`
- **AND** a living arena creature is within range
- **WHEN** that mage casts Bloodstrike on that creature and pays 3 mana
- **THEN** the target creature MUST gain temporary next-melee vampiric and pierce +1 facts
- **WHEN** that creature declares its next melee arena-object attack
- **THEN** the attack MUST apply the temporary pierce modifier to object armor
- **AND** the attacker controller mage MUST heal by the actual damage dealt, capped by existing damage
- **AND** the temporary Bloodstrike facts MUST clear after that melee attack resolves
- **AND** ranged attacks from the same creature MUST NOT apply or clear Bloodstrike
- **AND** unspent Bloodstrike facts MUST clear when the creature action phase exits
- **AND** other vampiric effects, equipment weapons, enchantments, response windows, and UI dice display MUST remain outside this slice

#### Scenario: Goran Werewolf Pet applies bloodthirst dice to wounded living melee targets
- **GIVEN** an apprentice Warlock has summoned Goran Werewolf Pet from configured spell card `2804`
- **WHEN** Goran declares a melee arena-object attack against a damaged living target
- **THEN** the attack MUST add one attack die from Goran's printed `嗜血+1` trait
- **AND** if Goran is in the same zone as its controlling mage, the attack MUST add one additional bloodthirst die from Goran's card text
- **AND** fresh living targets and nonliving targets MUST NOT receive bloodthirst dice
- **AND** multi-strike attacks MUST apply bloodthirst dice only to the first strike of that attack action
- **AND** mandatory attack targeting, taunt conflicts, equipment-imposed costs, elusiveness, walls, and UI dice display MUST remain outside this slice

#### Scenario: Deepwood Shadow preserves swift, elusive, legendary, and defense traits
- **GIVEN** an apprentice Warlock has prepared Deepwood Shadow from configured spell card `2824`
- **WHEN** that mage summons Deepwood Shadow into a legal zone and pays 14 mana
- **THEN** the summoned arena object MUST preserve its configured name, source card id, life, armor, defense profile, swift trait, elusive trait, legendary trait, and attack line
- **AND** a second Deepwood Shadow with the same source card id MUST be rejected while a matching legendary arena object remains in play
- **AND** the same summon MUST become legal again after the previous matching legendary arena object has left play
- **WHEN** Deepwood Shadow declares a melee arena-object attack against an enemy mage or non-guarding enemy object in a zone containing an enemy guard
- **THEN** the elusive trait MUST allow the attack to ignore guard interception
- **AND** if Deepwood Shadow voluntarily targets the guarding creature, the guard counterstrike opportunity MUST remain available
- **WHEN** Deepwood Shadow performs its first legal normal adjacent move from a zone containing an enemy creature
- **THEN** the elusive trait MUST prevent that starting-zone enemy creature from cancelling the printed swift free move
- **AND** a non-elusive swift creature hindered by a starting-zone enemy creature MUST move with normal action cost instead
- **AND** destination-zone hindrance after movement, walls, flight hindrance, full twelve-zone movement, and UI dice display MUST remain outside this slice

#### Scenario: Tanglevine attaches a conjuration and restrains a legal creature
- **GIVEN** an apprentice Beastmaster has prepared Tanglevine from configured spell card `2224`
- **WHEN** that mage casts Tanglevine on a legal corporeal non-flying creature and pays 5 mana
- **THEN** the runtime MUST summon a conjuration arena object in the target creature's zone
- **AND** the conjuration MUST preserve its configured name, source card id, life, armor, attack / trait line, rules text, and target-object anchor
- **AND** the target creature MUST record that it is restrained by the Tanglevine object rather than receiving a cripple token
- **AND** normal movement by the restrained target MUST be rejected while push effects that cannot affect unmovable targets MUST NOT move it
- **AND** mage targets, non-creature targets, flying creatures, and uncontainable creatures MUST be rejected
- **AND** a second same-named conjuration attached to the same target MUST be rejected
- **AND** ranged arena-object attacks MUST NOT be allowed to target Tanglevine while melee arena-object attacks remain legal
- **AND** removing the attached conjuration or moving / teleporting the anchored target MUST clear the attachment and restraint relationship
- **AND** enchantment-based restraint, walls, full push direction rules, other conjurations, and UI dice display MUST remain outside this slice

#### Scenario: Rouse the Beast readies a creature summoned this turn
- **GIVEN** an apprentice Beastmaster has prepared Rouse the Beast from configured spell card `3403`
- **AND** a living creature was summoned during the current round
- **WHEN** that mage casts Rouse the Beast on that creature and pays X equal to the target creature level
- **THEN** the runtime MUST emit an arena-object-roused event using the configured Rouse the Beast ability id
- **AND** the target creature action marker MUST become ready for the current round
- **AND** mage targets, conjurations, nonliving creatures, creatures summoned in a previous round, mismatched X costs, and same-target repeat casts in the same round MUST be rejected
- **AND** the per-round roused marker MUST clear when a new round starts
- **AND** enchantments, equipment, non-summon action recovery, UI dice display, and action-log detail MUST remain outside this slice

#### Scenario: Dissolve destroys equipment attached to a mage
- **GIVEN** an apprentice mage has prepared Dissolve from configured spell card `3406` or `3605`
- **AND** an equipment arena object is attached to a mage
- **WHEN** that mage casts Dissolve on the equipment object and pays X equal to that equipment spell cost
- **THEN** the runtime MUST emit an arena-object-defeated event using the configured Dissolve ability id
- **AND** the selected equipment object MUST leave play
- **AND** unattached equipment, non-equipment objects, mismatched X costs, insufficient mana, and equipment attached to a mage outside Dissolve range MUST be rejected
- **AND** equipment casting, equipment attribute bonuses, equipment slot limits, Explode, Dispel, Steal Enchantment, and full equipment UI MUST remain outside this slice

#### Scenario: Dispel destroys visible enchantments
- **GIVEN** an apprentice mage has prepared Dispel from configured spell card `3419` or `3606`
- **AND** a visible enchantment arena object is attached to a mage or arena object
- **WHEN** that mage casts Dispel on the visible enchantment object and pays X equal to that enchantment's cast cost plus reveal cost
- **THEN** the runtime MUST emit an arena-object-defeated event using the configured Dispel ability id
- **AND** the selected visible enchantment object MUST leave play
- **AND** hidden enchantments, unattached enchantments, non-enchantment objects, mismatched X costs, insufficient mana, and visible enchantments outside Dispel range MUST be rejected
- **AND** hidden enchantment casting, reveal timing, countering, ongoing enchantment effects, Steal Enchantment, and full enchantment UI MUST remain outside this slice

#### Scenario: Steal Enchantment moves a visible enchantment to a new legal target
- **GIVEN** an apprentice Wizard has prepared Steal Enchantment from configured spell card `3409`
- **AND** a visible enchantment arena object is attached to an arena object or zone
- **WHEN** that mage casts Steal Enchantment on the visible enchantment object and chooses a different legal target within Steal Enchantment range
- **THEN** the runtime MUST emit an enchantment-stolen event using the configured Steal Enchantment ability id
- **AND** the selected enchantment object MUST move to the new legal target
- **AND** the selected enchantment object's owner MUST become the casting mage's player
- **AND** X MUST equal the visible enchantment's current cast plus reveal cost, plus the cast plus reveal cost required to attach that enchantment to the new target
- **AND** missing new targets, multiple new targets, same-anchor targets, illegal new targets, hidden enchantments, unattached enchantments, non-enchantment objects, mismatched X costs, insufficient mana, visible enchantments outside range, and new targets outside range MUST be rejected
- **AND** hidden enchantment casting, reveal timing, countering, ongoing enchantment effects, full line-of-sight and wall rules, and full enchantment UI MUST remain outside this slice

#### Scenario: Visible object enchantments attach and grant continuous creature traits
- **GIVEN** an apprentice mage has prepared a supported visible object enchantment such as Bull Endurance, Magebane, Bear Strength, Regrowth, or Rhino Hide
- **WHEN** that mage casts the enchantment on a legal arena object target and pays its cast plus reveal cost
- **THEN** the runtime MUST summon a revealed enchantment arena object attached to the target object
- **AND** the enchantment object MUST preserve its configured source spell card id, owner, zone, target anchor, and rules text
- **AND** the continuous effects MUST be consumed from configured machine-readable semantics rather than the enchantment object's player-visible rules text
- **AND** Bull Endurance MUST increase the living target object's effective life by 4
- **AND** Magebane MUST make the target object slow for movement-cost purposes
- **AND** Bear Strength MUST add 2 dice to the target object's melee attacks without affecting ranged attacks
- **AND** Regrowth MUST contribute regeneration 2 as an enchantment source during upkeep
- **AND** Rhino Hide MUST increase the target object's effective armor by 2 for damage reduction
- **AND** illegal targets, missing object targets, mismatched cost, insufficient mana, and unsupported enchantments MUST be rejected
- **AND** hidden enchantment casting, reveal timing, countering, force-defense enchantments, aegis, zone enchantments, mage-only enchantments, and full enchantment UI MUST remain outside this slice

#### Scenario: Explode destroys mage-attached equipment and resolves fire attack against that mage
- **GIVEN** an apprentice Warlock has prepared Explode from configured spell card `3401`
- **AND** an equipment arena object is attached to a mage within Explode range
- **WHEN** that mage casts Explode on the equipment object and pays X equal to that equipment spell cost plus 6
- **THEN** the runtime MUST emit an arena-object-defeated event using the configured Explode ability id
- **AND** the selected equipment object MUST leave play before the follow-up fire attack is resolved
- **AND** the runtime MUST resolve a 4-dice unavoidable fire attack against the mage that equipment was attached to
- **AND** the follow-up fire attack MUST use Explode's effect die to place burn tokens on the target mage when the configured burn threshold is met
- **AND** the destroyed equipment MUST NOT contribute armor or elemental resistance to that follow-up attack
- **AND** unattached equipment, non-equipment objects, mismatched X costs, insufficient mana, and equipment attached to a mage outside Explode range MUST be rejected
- **AND** enchantments, Dispel, Steal Enchantment, equipment slots, equipment weapons, full equipment systems, and full equipment UI MUST remain outside this slice

#### Scenario: Basic armor equipment attaches to the caster mage
- **GIVEN** an apprentice mage has prepared Leather Gloves or Leather Boots from configured spell cards `3702` or `3721`
- **WHEN** that mage casts the equipment on itself and pays the configured 2 mana cost
- **THEN** the runtime MUST summon a public equipment arena object attached to that mage
- **AND** the equipment object MUST preserve the configured source card id, name, type line, trait text, owner, and current mage zone
- **AND** attacks against the attached mage MUST reduce attack damage by the armor bonus derived from attached equipment text
- **AND** mage movement MUST move attached equipment objects to the mage's new zone
- **AND** opponent targets, zone targets, object targets, missing targets, and non-basic equipment cards MUST be rejected
- **AND** equipment slot limits, class restrictions, weapon attacks, defenses, damage barriers, bound spells, and other equipment cards MUST remain outside this slice

#### Scenario: Passive armor equipment contributes armor and elemental resistance
- **GIVEN** an apprentice mage has prepared Dragon Scale Hauberk, Wind Wyvern Hide, Elemental Cloak, or Bearskin from configured spell cards `3703`, `3708`, `3709`, or `3711`
- **WHEN** that mage casts the equipment on itself and later becomes the target of a matching elemental spell or arena-object attack
- **THEN** the runtime MUST summon a public equipment arena object attached to that mage
- **AND** the equipment object MUST preserve the configured armor and damage-type modifier trait text
- **AND** the matching damage type modifier MUST reduce the attack dice and effect die result before damage is calculated
- **AND** the armor bonus derived from attached equipment text MUST reduce the resulting damage through the damage breakdown
- **AND** mage movement MUST move attached equipment objects to the mage's new zone
- **AND** equipment slot limits, class restrictions, weapon attacks, defenses, damage barriers, bound spells, and other equipment cards MUST remain outside this slice

#### Scenario: Sleep incantation places sleep on a legal creature
- **GIVEN** an apprentice mage has prepared the Sleep spell card from its configured spellbook
- **WHEN** that mage casts Sleep on a non-mage living creature and pays the configured X cost for that target creature's level
- **THEN** the runtime MUST emit a status-token placement event for one sleep token using the configured Sleep ability id
- **AND** Sleep MUST reject mage targets, nonliving creatures, mental-immune creatures, and mismatched X costs
