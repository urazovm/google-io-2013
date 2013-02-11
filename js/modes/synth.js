goog.require('ww.mode.Core');
goog.provide('ww.mode.SynthMode');


/**
 * @constructor
 * @param {Element} containerElem The containing element.
 * @param {String} assetPrefix The containing element.
 */
ww.mode.SynthMode = function(containerElem, assetPrefix) {
  goog.base(this, containerElem, assetPrefix, 'synth', true, true, false);
};
goog.inherits(ww.mode.SynthMode, ww.mode.Core);


/**
 * Initailize SynthMode.
 */
ww.mode.SynthMode.prototype.init = function() {
  goog.base(this, 'init');

  if (Modernizr.touch) {
    this.evtStart = 'touchstart.synth';
    this.evtEnd = 'touchend.synth';
  } else {
    this.evtStart = 'mousedown.synth';
    this.evtEnd = 'mouseup.synth';
  }

  this.getAudioContext_();
  this.source = this.audioContext_.createOscillator();
  this.tuna_ = new Tuna(this.audioContext_);
  this.analyser = this.audioContext_.createAnalyser();
  this.analyser.fftSize = 512;
  this.analyser.smoothingTimeConstant = 0.85;

  this.waveforms = $('#waveforms');

  this.freq = document.getElementById('oscillator-frequency');
  this.detune = document.getElementById('oscillator-detune');

  this.isPlaying = false;

  this.buildEffects_();
  this.createSound_();

  this.count = 360 * (this.width_ % 360);

  this.letterI = $('#letter-i');
  this.letterO = $('#letter-o');

  this.waveType = 1;
  this.lastFreq = 80;
  this.lastDetune = 650;
  this.lastHue = 0;
  this.lastXPercent = .5;
  this.lastYPercent = .5;

  this.waveMap = ['sine', 'square', 'saw', 'triangle'];

};


/**
 * Draw a single frame.
 * @param {Number} delta Ms since last draw.
 */
ww.mode.SynthMode.prototype.onFrame = function(delta) {
  goog.base(this, 'onFrame', delta);

  if (!this.isPlaying) {
    return;
  }

  this.count = this.count - (delta * 300);
  this.duration = this.duration + delta;

  // Draw frequency paths.
  var data = new Uint8Array(this.analyser.frequencyBinCount);
  this.analyser.getByteFrequencyData(data);

  var newY;
  var adjustY;
  for (var i = 0, p = this.paths.length; i < p; i++) {
    for (var j = 0, l = data.length / 2; j < l; j++) {
      newY = this.centerY - (data[j] * .75);
      adjustY = newY === this.centerY ? 0 : i * 5;
      this.paths[i]['segments'][j]['point']['y'] = newY + adjustY;
    }
    this.paths[i]['smooth']();
  }


  // Draw waves.
  var detune = Math.abs(Math.abs(this.lastDetune / 2400) - 2) + .5;
  var freq = this.lastFreq * .05; // * 0.00075;

  var min = 6;
  var amount = Math.floor(freq > min ? freq : min);
  var height = 100 * detune;
  var distance = this.width_ / amount;
  var xAdjust = 100 * this.lastXPercent;
  var yAdjust = 100 * this.lastYPercent;

  for (var j = 0, p = this.wavePaths.length; j < p; j++) {
    if (this.wavePaths[j]['segments'].length - 1 !== amount) {
      this.wavePaths[j]['removeSegments']();
      for (var i = 0; i <= amount; i++) {
        var point = new paper['Point'](
                      distance * i + j * xAdjust, this.centerY
                    );
        this.wavePaths[j].add(point);
      }
    }

    for (var i = 0; i <= amount; i++) {
      var segment = this.wavePaths[j]['segments'][i];
      var sin = Math.sin(this.duration * (amount * Math.PI / 8) + i);
      segment['point']['y'] = (sin * height + this.height_ / 2) + (j * yAdjust);
    }
    this.wavePaths[j]['strokeColor']['hue'] = this.lastHue;
    this.wavePaths[j]['smooth']();
  }

};


/**
 * Handles a browser window resize.
 * @param {Boolean} redraw Whether resize redraws.
 */
ww.mode.SynthMode.prototype.onResize = function(redraw) {
  goog.base(this, 'onResize', false);

  if (this.height_ < 500) {
    this.centerY = (this.height_ / 2) + (this.height_ - 256) / 2;
  } else {
    this.centerY = (this.height_ / 2) + (256 / 2);
  }

  this.scale = ~~(this.height_ * 0.5);
  this.waveHeight = ~~(this.height_ / 2);

  if (this.canvas_) {
    this.canvas_.width = this.width_;
    this.canvas_.height = this.height_;
  }

  this.oOffset = $('#letter-o').offset();
  this.oSize = $('#letter-o')[0]['getBoundingClientRect']()['width'];

  this.oRad = this.oSize / 2;
  this.oLeft = this.oOffset.left + this.oRad;
  this.oTop = this.oOffset.top + this.oRad;

  if (this.circle) {
    this.currentRad = this.circle['bounds']['width'] / 2;
    this.circle['position']['x'] = this.oLeft;
    this.circle['position']['y'] = this.oTop;
    this.circle['scale'](this.oRad / this.currentRad);
    this.circleClone['position']['x'] = this.oLeft;
    this.circleClone['position']['y'] = this.oTop;
    this.circleClone['scale'](this.oRad / this.currentRad);
  }

  if (this.paths) {
    var max = Math.max(this.oRad * 2, 128);
    var x = (this.oRad * 2) / 128;
    for (var j = 0, p = this.paths.length; j < p; j++) {
      for (var i = 0, l = this.paths[j]['segments'].length; i < l; i++) {
        this.paths[j]['segments'][i]['point']['x'] =
          x * i + this.oLeft - this.oRad;
        this.paths[j]['segments'][i]['point']['y'] = this.centerY;
      }
    }
  }

  if (redraw) {
    this.redraw();
  }

  var boundingI = $('#letter-i')[0]['getBoundingClientRect']();
  this.waveforms.css({
    'top': ~~boundingI['top'] + 'px',
    'left': ~~boundingI['left'] + 'px',
    'height': ~~boundingI['height'] + 'px',
    'width': ~~boundingI['width'] + 'px'
  });

};


/**
 * On focus, make the Synth interactive.
 */
ww.mode.SynthMode.prototype.didFocus = function() {
  goog.base(this, 'didFocus');

  var self = this;

  if (self.height_ < 500) {
    self.centerY = (self.height_ / 2) + (self.height_ - 256) / 2;
  } else {
    self.centerY = (self.height_ / 2) + (256 / 2);
  }

  self.scale = ~~(self.height_ * 0.5);
  self.waveHeight = ~~(self.height_ / 2);

  if (!self.path && !self.points) {
    self.getPaperCanvas_();
    self.ctx = self.paperCanvas_.getContext('2d');

    self.wavePath = new paper['Path']();
    self.wavePath['strokeColor'] = 'red';
    self.wavePath['strokeWidth'] = 2;

    self.wavePaths = [];
    self.wavePaths.push(self.wavePath);

    for (var i = 0; i < 3; i++) {
      var path = self.wavePath['clone']();
      path['strokeColor']['alpha'] = 0.3;
      self.wavePaths.push(path);
    }

    var max = Math.max(self.oRad * 2, 128);
    var size = (self.oRad * 2) / 128;

    self.circle = new paper['Path']['Circle'](
                    new paper['Point'](self.oLeft, self.oTop), self.oRad
                  );
    self.circleClone = self.circle['clone']();
    self.circleClone['fillColor'] = '#3777e3';
    self.circleClone['opacity'] = .9;

    self.path = new paper['Path']();
    self.path['strokeColor'] = new paper['RgbColor'](255, 255, 255, 0.2);
    self.path['strokeWidth'] = 5;

    for (var i = 0; i <= 128; i++) {
      var point = new paper['Point'](
                    size * i + self.oLeft - self.oRad, self.centerY
                  );
      self.path.add(point);
    }

    self.paths = [];
    self.paths.push(self.path);

    for (var i = 0; i < 3; i++) {
      var path = self.path['clone']();
      self.paths.push(path);
    }

    self.oscilloGroup = new paper['Group'](
                          self.circle,
                          self.paths[0],
                          self.paths[1],
                          self.paths[2],
                          self.paths[3]
                        );
    self.oscilloGroup['clipped'] = true;
    self.duration = 0;
  }

  self.isPlaying = false;
  self.connectPower_(); // connect

  self.letterI.bind(this.evtEnd, function() {
    self.changeWaveType();
  });
  self.letterO.bind(this.evtStart, function() {
    self.padTouchOn = true;
    self.lastFreq = self.calculateFrequency(event.pageX, event.pageY);
  });
  self.letterO.bind(this.evtEnd, function() {
    self.padTouchOn = false;
  });
  self.letterO.bind(Modernizr.touch ? 'touchmove' : 'mousemove', function() {
    if (self.padTouchOn) {
      self.changeFrequency(event);
    }
  });

  self.oOffset = self.letterO.offset();
  self.oSize = self.letterO[0]['getBoundingClientRect']()['width'];

};


/**
 * On unfocus, deactivate the Synth.
 */
ww.mode.SynthMode.prototype.didUnfocus = function() {
  goog.base(this, 'didUnfocus');

  this.isPlaying = true;
  this.connectPower_(); // disconnect
};


/**
 * @private
 */
ww.mode.SynthMode.prototype.buildEffects_ = function() {
  this.effects = {};
  this.effects['delay'] = new this.tuna_.Delay();
};


/**
 * @private
 */
ww.mode.SynthMode.prototype.createSound_ = function() {
  this.source.type = this.waveType;
  this.source.frequency.value = this.lastFreq;
  this.source.detune.value = this.lastDetune;
};


/**
 * @private
 */
ww.mode.SynthMode.prototype.connectPower_ = function() {
  if (!this.isPlaying) {
    this.playSound_();
    this.isPlaying = true;
  } else {
    this.pauseSound_();
    this.isPlaying = false;
  }
};


/**
 * @private
 */
ww.mode.SynthMode.prototype.playSound_ = function() {
  this.source.connect(this.effects['delay']['input']);
  this.effects['delay'].connect(this.analyser);
  this.analyser.connect(this.audioContext_.destination);
  this.source.noteOn(0);
};


/**
 * @private
 */
ww.mode.SynthMode.prototype.pauseSound_ = function() {
  this.source.disconnect();
};


/**
 * Toggle wave type between square, saw, triangle and sine
 * and set on class for icon.
 */
ww.mode.SynthMode.prototype.changeWaveType = function() {
  this.waveType++;
  this.waveType = this.waveType > 3 ? 0 : this.waveType;
  this.createSound_();

  $('.on', this.waveforms).removeClass('on');
  $('.' + this.waveMap[this.waveType], this.waveforms).addClass('on');

};


/**
 * Get new frequency and recreate sound.
 * @param {Object} event Page mouse event.
 */
ww.mode.SynthMode.prototype.changeFrequency = function(event) {
  this.calculateFrequency(event.pageX, event.pageY);
  this.createSound_();
};


/**
 * Parse mouse position to calculate new frequency.
 * @param {Integer} x page x position.
 * @param {Integer} y page y position.
 */
ww.mode.SynthMode.prototype.calculateFrequency = function(x, y) {

  var xDiff = x - this.oOffset.left;
  var yDiff = y - this.oOffset.top;
  var xPercent = xDiff / this.oSize;
  var yPercent = yDiff / this.oSize;

  this.lastFreq = 1000 - (1000 * yPercent);
  this.lastDetune = -4800 + (9600 * xPercent);
  this.lastHue = 60 - (60 * yPercent);
  this.lastYPercent = yPercent;
  this.lastXPercent = xPercent;

};
