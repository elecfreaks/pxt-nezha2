
//% color=#ff0011  icon="\uf06d" block="nezhaV2" blockId="nezhaV2"
namespace nezhaV2 {

	export enum MovementDirection {
		//%block="clockwise"
		CW = 1,
		//%block="counterclockwise"
		CCW = 2
	}
	export enum ServoMotionMode {
		//%block="clockwise"
		CW = 2,
		//%block="counterclockwise"
		CCW = 3,
		//%block="shortest path"
		ShortPath = 1
	}

	export enum DelayMode {
		//%block="automatic delay"
		AutoDelayStatus = 1,
		//%block="no delay"
		NoDelay = 0
	}
	export enum SportsMode {
		//%block="degrees"
		Degree = 2,
		//%block="turns"
		Circle = 1,
		//%block="seconds"
		Second = 3
	}


	export enum VerticallDirection {
		//%block="forward"
		Up = 1,
		//%block="backward"
		Down = 2
	}

	export enum Uint {
		//%block="cm"
		cm = 1,
		//%block="inch"
		inch = 2
	}

	export enum DistanceAndAngleUnit {
		//%block="degrees"
		Degree = 2,
		//%block="turns"
		Circle = 1,
		//%block="seconds"
		Second = 3,
		//%block="cm"
		cm = 4,
		//%block="inch"
		inch = 5
	}

	export enum MotorPostion {
		//%block="M1"
		M1 = 1,
		//%block="M2"
		M2 = 2,
		//%block="M3"
		M3 = 3,
		//%block="M4"
		M4 = 4
	}

	let i2cAddr: number = 0x10;
	let servoSpeedGlobal = 900
	// 相对角度值(用于相对角度值归零函数)
	let relativeAngularArr = [0, 0, 0, 0];
	// 组合积木块变量
	let motorLeftGlobal = 0
	let motorRightGlobal = 0
	let degreeToDistance = 0
	let wheelBaseDistance = 0
	let comboRotateCalibrationFactor = 1.0

	export function delayMs(ms: number): void {
		let time = input.runningTime() + ms
		while (time >= input.runningTime()) {

		}
	}

	export function motorDelay(value: number, motorFunction: SportsMode) {
		let delayTime = 0;
		if (value == 0 || servoSpeedGlobal == 0) {
			return;
		} else if (motorFunction == SportsMode.Circle) {
			delayTime = value * 360000.0 / servoSpeedGlobal + 500;
		} else if (motorFunction == SportsMode.Second) {
			delayTime = (value * 1000);
		} else if (motorFunction == SportsMode.Degree) {
			delayTime = value * 1000.0 / servoSpeedGlobal + 500;
		}
		basic.pause(delayTime);

	}

	//% group="Basic functions"
	//% block="set %motor at %speed\\%to run %direction %value %mode || %isDelay"
	//% inlineInputMode=inline
	//% speed.min=0  speed.max=100
	//% weight=407 
	export function move(motor: MotorPostion, speed: number, direction: MovementDirection, value: number, mode: SportsMode, isDelay: DelayMode = DelayMode.AutoDelayStatus): void {
		if (speed <= 0 || value <= 0) {
			// 速度和运行值不能小于等于0
			return;
		}
		setServoSpeed(speed);
		__move(motor, direction, value, mode);
		if (isDelay) {
			motorDelay(value, mode);
		}
	}

	export function __move(motor: MotorPostion, direction: MovementDirection, value: number, mode: SportsMode): void {

		let buf = pins.createBuffer(8);
		buf[0] = 0xFF;
		buf[1] = 0xF9;
		buf[2] = motor;
		buf[3] = direction;
		buf[4] = 0x70;
		buf[5] = (value >> 8) & 0XFF;
		buf[6] = mode;
		buf[7] = (value >> 0) & 0XFF;
		pins.i2cWriteBuffer(i2cAddr, buf);

	}

	//% group="Basic functions"
	//% weight=406
	//% block="set %motor to rotate %turnMode at angle %angle || %isDelay  "
	//% angle.min=0  angle.max=359
	//% inlineInputMode=inline
	export function moveToAbsAngle(motor: MotorPostion, turnMode: ServoMotionMode, angle: number, isDelay: DelayMode = DelayMode.AutoDelayStatus): void {
		while (angle < 0) {
			angle += 360
		}
		angle %= 360
		let buf = pins.createBuffer(8)
		buf[0] = 0xFF;
		buf[1] = 0xF9;
		buf[2] = motor;
		buf[3] = 0x00;
		buf[4] = 0x5D;
		buf[5] = (angle >> 8) & 0XFF;
		buf[6] = turnMode;
		buf[7] = (angle >> 0) & 0XFF;
		pins.i2cWriteBuffer(i2cAddr, buf);
		delayMs(4);// 等待不能删除，且禁止有其他任务插入，否则有BUG
		if (isDelay) {
			motorDelay(0.5, SportsMode.Second)
		}
	}

	//% group="Basic functions"
	//% weight=404
	//% block="set %motor shutting down the motor"
	export function stop(motor: MotorPostion): void {
		let buf = pins.createBuffer(8)
		buf[0] = 0xFF;
		buf[1] = 0xF9;
		buf[2] = motor;
		buf[3] = 0x00;
		buf[4] = 0x5F;
		buf[5] = 0x00;
		buf[6] = 0xF5;
		buf[7] = 0x00;
		pins.i2cWriteBuffer(i2cAddr, buf);
	}

	export function __start(motor: MotorPostion, direction: MovementDirection, speed: number): void {
		let buf = pins.createBuffer(8)
		buf[0] = 0xFF;
		buf[1] = 0xF9;
		buf[2] = motor;
		buf[3] = direction;
		buf[4] = 0x60;
		buf[5] = Math.floor(speed);
		buf[6] = 0xF5;
		buf[7] = 0x00;
		pins.i2cWriteBuffer(i2cAddr, buf);
	}

	//% group="Basic functions"
	//% weight=403
	//% block="set the speed of %motor to %speed \\% and start the motor"
	//% speed.min=-100  speed.max=100
	export function start(motor: MotorPostion, speed: number): void {
		if (speed < -100) {
			speed = -100
		} else if (speed > 100) {
			speed = 100
		}
		let direction = speed > 0 ? MovementDirection.CW : MovementDirection.CCW
		__start(motor, direction, Math.abs(speed))
	}

	export function readAngle(motor: MotorPostion): number {
		delayMs(4)
		let buf = pins.createBuffer(8);
		buf[0] = 0xFF;
		buf[1] = 0xF9;
		buf[2] = motor;
		buf[3] = 0x00;
		buf[4] = 0x46;
		buf[5] = 0x00;
		buf[6] = 0xF5;
		buf[7] = 0x00;
		pins.i2cWriteBuffer(i2cAddr, buf);
		delayMs(4)
		let arr = pins.i2cReadBuffer(i2cAddr, 4);
		return (arr[3] << 24) | (arr[2] << 16) | (arr[1] << 8) | (arr[0]);
	}

	//% group="Basic functions"
	//% weight=402
	//% block="%motor absolute angular value"
	export function readAbsAngle(motor: MotorPostion): number {
		let position = readAngle(motor)
		while (position < 0) {
			position += 3600;
		}
		return (position % 3600) * 0.1;
	}

	//% group="Basic functions"
	//% weight=402
	//% block="%motor relative angular value"
	export function readRelAngle(motor: MotorPostion): number {
		return (readAngle(motor) - relativeAngularArr[motor - 1]) * 0.1;
	}

	//% group="Basic functions"
	//% weight=400
	//% block="%motor speed (laps/sec)"
	export function readSpeed(motor: MotorPostion): number {
		delayMs(4)
		let buf = pins.createBuffer(8)
		buf[0] = 0xFF;
		buf[1] = 0xF9;
		buf[2] = motor;
		buf[3] = 0x00;
		buf[4] = 0x47;
		buf[5] = 0x00;
		buf[6] = 0xF5;
		buf[7] = 0x00;
		pins.i2cWriteBuffer(i2cAddr, buf);
		delayMs(4)
		let arr = pins.i2cReadBuffer(i2cAddr, 2);
		let retData = (arr[1] << 8) | (arr[0]);
		return Math.floor(retData / 3.6) * 0.01;
	}

	//% group="Basic functions"
	//% weight=399
	//% block="set servo %motor to zero"
	export function reset(motor: MotorPostion): void {
		let buf = pins.createBuffer(8)
		buf[0] = 0xFF;
		buf[1] = 0xF9;
		buf[2] = motor;
		buf[3] = 0x00;
		buf[4] = 0x1D;
		buf[5] = 0x00;
		buf[6] = 0xF5;
		buf[7] = 0x00;
		pins.i2cWriteBuffer(i2cAddr, buf);
		relativeAngularArr[motor - 1] = 0;
		motorDelay(1, SportsMode.Second)
	}

	//% group="Basic functions"
	//% weight=399
	//% block="set servo %motor relative angular to zero"
	export function resetRelAngleValue(motor: MotorPostion) {
		relativeAngularArr[motor - 1] = readAngle(motor);
	}

	export function setServoSpeed(speed: number): void {
		if (speed < 0) speed = 0;
		speed *= 9;
		servoSpeedGlobal = speed;
		let buf = pins.createBuffer(8)
		buf[0] = 0xFF;
		buf[1] = 0xF9;
		buf[2] = 0x00;
		buf[3] = 0x00;
		buf[4] = 0x77;
		buf[5] = (speed >> 8) & 0XFF;
		buf[6] = 0x00;
		buf[7] = (speed >> 0) & 0XFF;
		pins.i2cWriteBuffer(i2cAddr, buf);

	}

	//% group="Application functions"
	//% weight=410
	//%block="set the running motor to left wheel %motor_l right wheel %motor_r"
	export function setComboMotor(motor_l: MotorPostion, motor_r: MotorPostion): void {
		motorLeftGlobal = motor_l;
		motorRightGlobal = motor_r;
	}

	//% group="Application functions"
	//% weight=409
	//%block="Set %speed\\% speed and move %direction"
	//% speed.min=0  speed.max=100
	export function comboRun(speed: number, direction: VerticallDirection): void {
		if (speed < 0) {
			speed = 0;
		} else if (speed > 100) {
			speed = 100;
		}
		__start(motorLeftGlobal, direction % 2 + 1, speed);
		__start(motorRightGlobal, (direction + 1) % 2 + 1, speed);
	}


	//% group="Application functions"
	//% weight=406
	//%block="stop movement"
	export function comboStop(): void {
		stop(motorLeftGlobal)
		stop(motorRightGlobal)
	}

	/**
	* The distance length of the motor movement per circle
	*/
	//% group="Application functions"
	//% weight=404
	//% block="set the wheel circumference to %value %unit"
	export function setWheelPerimeter(value: number, unit: Uint): void {
		if (value < 0) {
			value = 0;
		}
		if (unit == Uint.inch) {
			degreeToDistance = value * 2.54
		} else {
			degreeToDistance = value
		}
	}

	//% group="Application functions"
	//% weight=401
	//% block="set wheelbase (distance between wheels) to %value %unit"
	export function setWheelBase(value: number, unit: Uint): void {
		if (value < 0) value = 0
		if (unit == Uint.inch) {
			wheelBaseDistance = value * 2.54
		} else {
			wheelBaseDistance = value
		}
	}

	//% group="Application functions"
	//% weight=398
	//% block="set combo rotate calibration factor to %factor"
	//% factor.min=0.5 factor.max=1.5 factor.defl=1.0
	export function setComboRotateCalibration(factor: number): void {
		if (factor <= 0) factor = 1.0
		comboRotateCalibrationFactor = factor
	}

	//% group="Application functions"
	//% weight=403
	//% block="combination Motor Move at %speed to %direction %value %uint "
	//% speed.min=0 speed.max=100
	//% inlineInputMode=inline
	export function comboMove(speed: number, direction: VerticallDirection, value: number, uint: DistanceAndAngleUnit): void {
		if (speed <= 0) {
			return;
		}
		setServoSpeed(speed)
		let mode;
		switch (uint) {
			case DistanceAndAngleUnit.Circle:
				mode = SportsMode.Circle;
				break;
			case DistanceAndAngleUnit.Degree:
				mode = SportsMode.Degree;
				break;
			case DistanceAndAngleUnit.Second:
				mode = SportsMode.Second;
				break;
			case DistanceAndAngleUnit.cm:
				value = 360 * value / degreeToDistance
				mode = SportsMode.Degree;
				break;
			case DistanceAndAngleUnit.inch:
				value = 360 * value * 2.54 / degreeToDistance
				mode = SportsMode.Degree;
				break;
		}
		if (direction == VerticallDirection.Up) {
			__move(motorLeftGlobal, MovementDirection.CCW, value, mode)
			__move(motorRightGlobal, MovementDirection.CW, value, mode)
		}
		else {
			__move(motorLeftGlobal, MovementDirection.CW, value, mode)
			__move(motorRightGlobal, MovementDirection.CCW, value, mode)
		}
		motorDelay(value, mode);
	}

	//% group="Application functions"
	//% weight=400
	//% block="combination Motor rotate by %angle degrees at %speed\\%"
	//% angle.min=-720 angle.max=720
	//% speed.min=0 speed.max=100
	export function comboRotate(angle: number, speed: number): void {
		if (speed <= 0 || angle == 0) return
		if (wheelBaseDistance == 0 || degreeToDistance == 0) return

		let direction: MovementDirection =
			angle > 0 ? MovementDirection.CW : MovementDirection.CCW

		angle = Math.abs(angle)

		let radians = angle * Math.PI / 180
		let arcDistance = radians * (wheelBaseDistance / 2)

		// apply calibration factor
		let motorDegrees = (arcDistance * 360 * comboRotateCalibrationFactor) / degreeToDistance

		setServoSpeed(speed)

		if (direction == MovementDirection.CW) {
			__move(motorLeftGlobal, MovementDirection.CCW, motorDegrees, SportsMode.Degree)
			__move(motorRightGlobal, MovementDirection.CCW, motorDegrees, SportsMode.Degree)
		} else {
			__move(motorLeftGlobal, MovementDirection.CW, motorDegrees, SportsMode.Degree)
			__move(motorRightGlobal, MovementDirection.CW, motorDegrees, SportsMode.Degree)
		}

		motorDelay(motorDegrees, SportsMode.Degree)
	}

	//% group="Application functions"
	//% weight=402
	//%block="set the left wheel speed at %speed_l \\%, right wheel speed at %speed_r \\% and start the motor"
	//% speed_l.min=-100  speed_l.max=100 speed_r.min=-100  speed_r.max=100
	export function comboStart(speed_l: number, speed_r: number): void {
		start(motorLeftGlobal, -speed_l);
		start(motorRightGlobal, speed_r);
	}

	//% group="export functions"
	//% weight=320
	//%block="version number"
	export function readVersion(): string {
		let buf = pins.createBuffer(8);
		buf[0] = 0xFF;
		buf[1] = 0xF9;
		buf[2] = 0x00;
		buf[3] = 0x00;
		buf[4] = 0x88;
		buf[5] = 0x00;
		buf[6] = 0x00;
		buf[7] = 0x00;
		pins.i2cWriteBuffer(i2cAddr, buf);
		let version = pins.i2cReadBuffer(i2cAddr, 3);
		return `V ${version[0]}.${version[1]}.${version[2]}`;
	}
}
