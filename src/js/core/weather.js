// Live weather from Open-Meteo and the mapping onto the conditions form.

function wmoToWeather(code, windKph) { if(code>=95)return 'coldfront'; if(code>=80||code>=61)return 'rain'; if(code===3)return 'overcast'; if(code===2)return windKph>25?'windy':'overcast'; if(code<=1)return windKph>30?'windy':'sunny'; return 'overcast'; }

function wmoToWind(kph) { if(kph<10)return 'calm'; if(kph<20)return 'gentle'; if(kph<35)return 'moderate'; return 'strong'; }

function pressureToApp(hpa, trend) { if(trend>1.5)return 'rising'; if(trend<-1.5)return 'falling'; if(hpa<1005)return 'low'; return 'stable'; }

function getTempSeason(month) { if(month>=3&&month<=5)return 'autumn'; if(month>=6&&month<=8)return 'winter'; if(month>=9&&month<=11)return 'spring'; return 'summer'; }

function getTimeOfDay() { var h=new Date().getHours(); if(h<8)return 'early'; if(h<11)return 'midmorning'; if(h<14)return 'midday'; if(h<17)return 'afternoon'; return 'evening'; }

function fetchWeather() {
 var loadEl=document.getElementById('weather-loading');
 var errorEl=document.getElementById('weather-error');
 var cardEl=document.getElementById('weather-card');
 var promptEl=document.getElementById('weather-prompt');
 errorEl.style.display='none'; cardEl.style.display='none'; promptEl.style.display='none'; loadEl.style.display='flex';
 if(!navigator.geolocation){loadEl.style.display='none';errorEl.textContent='Location not supported on this device.';errorEl.style.display='block';promptEl.style.display='flex';return;}
 navigator.geolocation.getCurrentPosition(function(pos){
 var lat=pos.coords.latitude.toFixed(4); var lon=pos.coords.longitude.toFixed(4);
 var url='https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lon+'&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,surface_pressure&hourly=surface_pressure&forecast_days=1&timezone=auto';
 var xhr=new XMLHttpRequest(); xhr.open('GET',url,true);
 xhr.onreadystatechange=function(){
 if(xhr.readyState!==4)return; loadEl.style.display='none';
 if(xhr.status!==200){errorEl.textContent='Could not fetch weather. Please set conditions manually.';errorEl.style.display='block';promptEl.style.display='flex';return;}
 try {
 var data=JSON.parse(xhr.responseText); var c=data.current;
 var code=c.weather_code; var temp=Math.round(c.temperature_2m); var windKph=Math.round(c.wind_speed_10m);
 var humidity=Math.round(c.relative_humidity_2m); var rain=c.precipitation; var pressure=Math.round(c.surface_pressure);
 var pArr=data.hourly&&data.hourly.surface_pressure; var pTrend=0;
 if(pArr&&pArr.length>=4)pTrend=pArr[3]-pArr[0];
 var wmo=WMO_CODES[code]||{desc:'Variable',icon:''};
 var month=new Date().getMonth()+1;
 lastWeatherData={temp:temp,windKph:windKph,code:code,pressure:pressure,pTrend:pTrend,month:month,wmo:wmo,humidity:humidity,rain:rain};
 document.getElementById('w-icon').textContent=wmo.icon;
 document.getElementById('w-temp').textContent=temp+'°C';
 document.getElementById('w-desc').textContent=wmo.desc;
 document.getElementById('w-wind').textContent=windKph+' km/h';
 document.getElementById('w-humidity').textContent=humidity+'%';
 document.getElementById('w-rain').textContent=rain+' mm';
 document.getElementById('w-pressure').textContent=pressure+' hPa';
 var tz=(data.timezone||'').replace('_',' ').split('/').pop();
 document.getElementById('w-location').textContent=tz||('Lat '+lat+', Lon '+lon);
 var appWeather=wmoToWeather(code,windKph); var appWind=wmoToWind(windKph);
 var appPressure=pressureToApp(pressure,pTrend); var appSeason=getTempSeason(month); var appTod=getTimeOfDay();
 var wLabels={sunny:'Sunny',overcast:'Overcast',rain:'Light rain',windy:'Windy',coldfront:'Cold front'};
 var wdLabels={calm:'Calm',gentle:'Gentle',moderate:'Moderate',strong:'Strong'};
 var pLabels={rising:'Rising ↑',stable:'Stable →',falling:'Falling ↓',low:'Post-storm'};
 document.getElementById('w-autofill-summary').textContent=temp+'°C · '+(wLabels[appWeather]||appWeather)+' · Wind '+(wdLabels[appWind]||appWind)+' · Pressure '+(pLabels[appPressure]||appPressure);
 document.getElementById('weather-autofill').style.display='block';
 cardEl.style.display='block';
 } catch(e) { errorEl.textContent='Error reading weather data.';errorEl.style.display='block';promptEl.style.display='flex'; }
 };
 xhr.onerror=function(){loadEl.style.display='none';errorEl.textContent='No internet connection. Please set conditions manually.';errorEl.style.display='block';promptEl.style.display='flex';};
 xhr.send();
 },function(err){
 loadEl.style.display='none';
 var msgs={1:'Location access denied. Please allow location access.',2:'Location unavailable.',3:'Location request timed out.'};
 errorEl.textContent=msgs[err.code]||'Could not get location.';errorEl.style.display='block';promptEl.style.display='flex';
 },{timeout:10000,maximumAge:300000});
}

function applyWeather() {
 if(!lastWeatherData)return;
 var d=lastWeatherData;
 var appWeather=wmoToWeather(d.code,d.windKph); var appWind=wmoToWind(d.windKph);
 var appPressure=pressureToApp(d.pressure,d.pTrend); var appSeason=getTempSeason(d.month); var appTod=getTimeOfDay();
 document.getElementById('temp').value=d.temp; document.getElementById('month').value=d.month;
 var sels={season:appSeason,weather:appWeather,wind:appWind,tod:appTod};
 for(var id in sels){var sel=document.getElementById(id);for(var i=0;i<sel.options.length;i++){if(sel.options[i].value===sels[id]){sel.selectedIndex=i;break;}}}
 pressureVal=appPressure;
 var pBtns=document.querySelectorAll('#pressureRow .press-btn');
 var pMap=['rising','stable','falling','low'];
 for(var i=0;i<pBtns.length;i++){if(pMap[i]===appPressure)pBtns[i].classList.add('active');else pBtns[i].classList.remove('active');}
 document.getElementById('weather-autofill').innerHTML='<strong> Conditions applied</strong> from live weather · <span style="color:var(--ink-3);font-size:11px;">Adjust manually below if needed</span>';
 showToast(' Weather conditions applied!');
}
