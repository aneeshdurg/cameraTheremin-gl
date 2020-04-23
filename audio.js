var started = false;
var playing = false;
var synth = new Tone.MonoSynth().toMaster();
var pitchShift = new Tone.PitchShift();
var oldfreq = -1;
var record = false;
var recording = [];
var playBack = false;
var tracking = 0;
var offset = 0;
var oldxs, oldxe;
$(function(){
	$("#threshSlider").slider({
		max: 255,
		value: 70,
		slide: function(event, ui){
			threshDelta(ui.value);
		}
	});
});
function start(){
	if(!started){
		document.getElementById("strt").innerHTML = "Stop theremin";
	} else{
		synth.triggerRelease();
		document.getElementById("strt").innerHTML = "Start theremin ";
		document.getElementById("freq").innerHTML = "Frequency: 0 Hz";
		document.getElementById("vol").innerHTML = "Volume: 0 db";
		document.getElementById("count").innerHTML = "Detected area: 0 px";
		playing = false;
	}
	started = !started;
	dogaussblur = !dogaussblur;
	dothresh = !dothresh;
	docrop = !docrop;
	doColorChange = !doColorChange;
}
function playSynth(freq, vol){
	if(vol==-100){
		return;
	}
	if(!playing){
		synth.triggerAttack(oldfreq);
		playing = true;
	}
	if(!playBack){
		document.getElementById("freq").innerHTML = "Frequency: "+freq+" Hz";
		if(freq>0&&freq!=oldfreq){
			if(!cont)
				synth.frequency.rampTo(freq, 0.05);
			else
				synth.setNote(freq);
		}
		if(dobinsub&&volEnable){
			vol -= 80;
			vol/=12;
			//vol+=offset;
			//synth.volume.value = vol;
			if (vol<0){
				//offset+=Math.abs(vol);
				vol = 0;
			}
			if(vol>15)
				vol = 15;
			synth.volume.rampTo(vol, 0.07);
			vol = Math.floor(vol*100)/100;
			document.getElementById("vol").innerHTML = 'Volume: '+vol+' db';
		}
		else{
			vol = 10;
			synth.volume.value = 10;
			document.getElementById("vol").innerHTML = 'Volume: 10 db';
		}
		if(record){
			recording.push([freq, vol]);
		}
	}
	else{
		if(tracking>=recording.length){
			startPlayBack();
			//playBack = false;
			//xe = oldxe;
			//xs = oldxs;
			//start();
			return;
		}
		var stepSize = width/recording.length;
		xs = Math.floor(tracking*stepSize);
		freq = recording[tracking][0];
		vol = recording[tracking][1];
		synth.frequency.rampTo(freq, 0.05);
		synth.volume.rampTo(vol, 0.07);
		document.getElementById("freq").innerHTML = "Frequency: "+freq+" Hz";
		document.getElementById("vol").innerHTML = "Volume: "+vol+" db";
		tracking++;
	}
	oldfreq = freq;
	return freq;
}
