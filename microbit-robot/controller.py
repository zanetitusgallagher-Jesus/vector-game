# CONTROLLER (second micro:bit) - MakeCode Python, extension: radio
# Tilt to drive, A = spin left, B = spin right, A+B = speed level, shake = STOP
# Sends the same strings as the original (FWD/BWD/LEFT/RIGHT/STOP) on group 1

speeds = [40, 70, 100]
level = 1
holding = ""   # "SL"/"SR" while a button is held

def send_speed():
    radio.send_string("SPD:" + str(speeds[level]))
    basic.show_number(level + 1)

def on_ab():
    global level
    level = (level + 1) % len(speeds)
    send_speed()
input.on_button_pressed(Button.AB, on_ab)

def on_shake():
    radio.send_string("STOP")
    basic.show_icon(IconNames.NO)
input.on_gesture(Gesture.SHAKE, on_shake)

radio.set_group(1)
radio.set_transmit_power(7)
send_speed()

def on_forever():
    x = input.acceleration(Dimension.X)
    y = input.acceleration(Dimension.Y)
    cmd = "STOP"
    if input.button_is_pressed(Button.A) and not input.button_is_pressed(Button.B):
        cmd = "SL"
    elif input.button_is_pressed(Button.B) and not input.button_is_pressed(Button.A):
        cmd = "SR"
    elif y < -300:
        cmd = "FWD"
    elif y > 300:
        cmd = "BWD"
    elif x < -300:
        cmd = "LEFT"
    elif x > 300:
        cmd = "RIGHT"
    radio.send_string(cmd)   # resent every loop so the robot never misses it
    radio.send_string("HB")
    led.toggle(2, 2)
    basic.pause(100)
basic.forever(on_forever)
