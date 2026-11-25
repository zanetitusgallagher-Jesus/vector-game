# ROBOT (WuKong board) - MakeCode Python
# Extension needed: wuKong (github:elecfreaks/pxt-wukong), radio
# Compatible with the old controller: radio group 1, strings FWD/BWD/LEFT/RIGHT/STOP
# Extras: SPD:<0-100> speed, SL/SR spin, HB heartbeat (auto-stop if signal lost)

speed = 90          # current drive speed (0-100)
last_cmd = "STOP"
last_heard = 0      # time of last radio message
failsafe = False    # turns on only when a new controller sends heartbeats

def drive(left: number, right: number):
    # S0 = left wheel (mirrored), S1 = right wheel
    wuKong.set_servo_speed(wuKong.ServoList.S0, -left)
    wuKong.set_servo_speed(wuKong.ServoList.S1, right)

def run(cmd: str):
    global last_cmd
    last_cmd = cmd
    if cmd == "FWD":
        drive(speed, speed)
        basic.show_arrow(ArrowNames.NORTH)
    elif cmd == "BWD":
        drive(-speed, -speed)
        basic.show_arrow(ArrowNames.SOUTH)
    elif cmd == "LEFT":
        drive(speed, 0)   # same turn as original code
        basic.show_arrow(ArrowNames.WEST)
    elif cmd == "RIGHT":
        drive(0, speed)
        basic.show_arrow(ArrowNames.EAST)
    elif cmd == "SL":
        drive(speed, -speed)
        basic.show_icon(IconNames.ROLLERSKATE)
    elif cmd == "SR":
        drive(-speed, speed)
        basic.show_icon(IconNames.ROLLERSKATE)
    else:
        last_cmd = "STOP"
        drive(0, 0)
        basic.show_icon(IconNames.SQUARE)

def on_received_string(s):
    global speed, last_heard, failsafe
    last_heard = control.millis()
    if s == "HB":
        failsafe = True
        return
    if s.substr(0, 4) == "SPD:":
        speed = Math.constrain(parse_float(s.substr(4, 3)), 0, 100)
        if last_cmd != "STOP":
            run(last_cmd)   # apply new speed right away
        return
    if s != last_cmd:
        run(s)
radio.on_received_string(on_received_string)

# Buttons on the robot itself (same as before) + emergency stop with logo
def on_a():
    radio.send_string("FWD")
input.on_button_pressed(Button.A, on_a)
def on_b():
    radio.send_string("BWD")
input.on_button_pressed(Button.B, on_b)
def on_ab():
    radio.send_string("STOP")
    run("STOP")
input.on_button_pressed(Button.AB, on_ab)
def on_logo():
    run("STOP")
input.on_logo_event(TouchButtonEvent.PRESSED, on_logo)

# Startup
radio.set_group(1)
radio.set_transmit_power(7)
wuKong.set_light_mode(wuKong.LightMode.BREATH)
run("STOP")
music.play(music.tone_playable(Note.C5, music.beat(BeatFraction.EIGHTH)),
    music.PlaybackMode.IN_BACKGROUND)

# Failsafe: if a heartbeat controller goes quiet for 0.7 s, stop
def on_forever():
    if failsafe and last_cmd != "STOP" and control.millis() - last_heard > 700:
        run("STOP")
    basic.pause(50)
basic.forever(on_forever)
