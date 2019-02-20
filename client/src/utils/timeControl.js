function timeUnitToSeconds(value, unit)
{
  let seconds = value;
  switch (unit)
  {
    case 'd':
      seconds *= 24;
    case 'h':
      seconds *= 60;
    case 'm':
      seconds *= 60;
  }
  return seconds;
}

function isLargerUnit(unit1, unit2)
{
  return (unit1 == 'd' && unit2 != 'd')
    || (unit1 == 'h' && ['s','m'].includes(unit2))
    || (unit1 == 'm' && unit2 == 's');
}

export function extractTime(timeControl)
{
  const tcParts = timeControl.replace(/ /g,"").split('+');
	const mainTimeArray = tcParts[0].match(/([0-9]+)([smhd])/);
  if (!mainTimeArray)
    return null;
  const mainTimeValue = parseInt(mainTimeArray[1]);
  const mainTimeUnit = mainTimeArray[2];
  const mainTime = timeUnitToSeconds(mainTimeValue, mainTimeUnit);
  let increment = 0;
  if (tcParts.length >= 2)
  {
    const increment = tcParts[1].match(/([0-9]+)([smhd])/);
    if (!increment)
      return null;
    const incrementValue = parseInt(increment[1]);
    const incrementUnit = increment[2];
    // Increment unit cannot be larger than main unit:
    if (isLargerUnit(incrementUnit, mainTimeUnit))
      return null;
    increment = timeUnitToSeconds(incrementValue, incrementUnit);
  }
  return {mainTime:mainTime, increment:increment};
}
