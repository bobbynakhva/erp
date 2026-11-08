// Engineering Unit Converter Utility (frmConv)
(function () {
  const UNITS = {
    length: {
      units: ["Meter (m)", "Kilometer (km)", "Centimeter (cm)", "Millimeter (mm)", "Micron (µm)", "Inch (in)", "Foot (ft)", "Yard (yd)", "Mile (mi)", "Nautical Mile"],
      toBase: [1, 1000, 0.01, 0.001, 1e-6, 0.0254, 0.3048, 0.9144, 1609.344, 1852]
    },
    mass: {
      units: ["Kilogram (kg)", "Gram (g)", "Milligram (mg)", "Metric Ton (t)", "Pound (lb)", "Ounce (oz)", "Quintal (q)"],
      toBase: [1, 0.001, 1e-6, 1000, 0.45359237, 0.028349523, 100]
    },
    temp: {
      units: ["Celsius (°C)", "Fahrenheit (°F)", "Kelvin (K)"]
      // Handled via custom functions
    },
    area: {
      units: ["Square Meter (m²)", "Square Kilometer (km²)", "Square Centimeter (cm²)", "Square Millimeter (mm²)", "Square Foot (ft²)", "Square Inch (in²)", "Square Yard (yd²)", "Acre", "Hectare"],
      toBase: [1, 1e6, 0.0001, 1e-6, 0.09290304, 0.00064516, 0.83612736, 4046.85642, 10000]
    },
    pressure: {
      units: ["Bar (bar)", "Pascal (Pa)", "Kilopascal (kPa)", "Megapascal (MPa)", "Pounds/Sq Inch (psi)", "Atmosphere (atm)", "Torr / mmHg", "kg/cm²"],
      toBase: [100000, 1, 1000, 1e6, 6894.75729, 101325, 133.322368, 98066.5]
    },
    volume: {
      units: ["Liter (L)", "Milliliter (mL)", "Cubic Meter (m³)", "Cubic Centimeter (cm³)", "US Gallon (gal)", "Imperial Gallon", "Cubic Foot (ft³)", "Cubic Inch (in³)"],
      toBase: [0.001, 1e-6, 1, 1e-6, 0.00378541, 0.00454609, 0.028316846, 1.6387e-5]
    },
    speed: {
      units: ["Meters / Second (m/s)", "Kilometers / Hour (km/h)", "Miles / Hour (mph)", "Feet / Second (ft/s)", "Knot (kn)"],
      toBase: [1, 0.277777778, 0.44704, 0.3048, 0.514444444]
    },
    force: {
      units: ["Newton (N)", "Kilonewton (kN)", "Kilogram-Force (kgf)", "Pound-Force (lbf)", "Dyne (dyn)"],
      toBase: [1, 1000, 9.80665, 4.4482216, 1e-5]
    },
    power: {
      units: ["Watt (W)", "Kilowatt (kW)", "Megawatt (MW)", "Mechanical Horsepower (hp)", "Metric Horsepower (PS)"],
      toBase: [1, 1000, 1e6, 745.69987, 735.49875]
    },
    energy: {
      units: ["Joule (J)", "Kilojoule (kJ)", "Kilowatt-Hour (kWh)", "Calorie (cal)", "Kilocalorie (kcal)", "British Thermal Unit (BTU)"],
      toBase: [1, 1000, 3.6e6, 4.184, 4184, 1055.056]
    },
    angle: {
      units: ["Degree (°)", "Radian (rad)", "Gradian (grad)", "Minute of Arc (')", "Second of Arc (\")"],
      toBase: [1, 57.2957795, 0.9, 0.0166666667, 0.0002777778]
    },
    time: {
      units: ["Second (s)", "Millisecond (ms)", "Minute (min)", "Hour (hr)", "Day (d)", "Week (wk)", "Month (avg)", "Year (365d)"],
      toBase: [1, 0.001, 60, 3600, 86400, 604800, 2629746, 31536000]
    }
  };

  let currentDim = "length";

  function el(id) {
    return document.getElementById(id);
  }

  function setDimension(dim) {
    if (!UNITS[dim]) return;
    currentDim = dim;

    const fromSel = el("conv-sel-from");
    const toSel = el("conv-sel-to");
    if (!fromSel || !toSel) return;

    let opts = "";
    UNITS[dim].units.forEach((u, idx) => {
      opts += `<option value="${idx}">${u}</option>`;
    });

    fromSel.innerHTML = opts;
    toSel.innerHTML = opts;

    fromSel.selectedIndex = 0;
    toSel.selectedIndex = Math.min(1, UNITS[dim].units.length - 1);

    calculate();
  }

  function calculate() {
    const fromSel = el("conv-sel-from");
    const toSel = el("conv-sel-to");
    const inVal = Number(el("conv-input-val")?.value || 0);
    const resDiv = el("conv-result-val");
    if (!fromSel || !toSel || !resDiv) return;

    const fromIdx = fromSel.selectedIndex >= 0 ? fromSel.selectedIndex : 0;
    const toIdx = toSel.selectedIndex >= 0 ? toSel.selectedIndex : 0;

    if (isNaN(inVal)) {
      resDiv.textContent = "Invalid Number";
      return;
    }

    if (currentDim === "temp") {
      let result = 0;
      // 0: Celsius, 1: Fahrenheit, 2: Kelvin
      let c = inVal;
      if (fromIdx === 1) c = (inVal - 32) * (5 / 9);
      else if (fromIdx === 2) c = inVal - 273.15;

      if (toIdx === 0) result = c;
      else if (toIdx === 1) result = c * (9 / 5) + 32;
      else if (toIdx === 2) result = c + 273.15;

      resDiv.textContent = Number(result.toFixed(6)).toString();
      return;
    }

    const conf = UNITS[currentDim];
    if (!conf || !conf.toBase) return;

    const baseVal = inVal * conf.toBase[fromIdx];
    const finalVal = baseVal / conf.toBase[toIdx];

    resDiv.textContent = Number(finalVal.toPrecision(8)).toString();
  }

  function invertUnits() {
    const fromSel = el("conv-sel-from");
    const toSel = el("conv-sel-to");
    if (!fromSel || !toSel) return;

    const fromIdx = fromSel.selectedIndex;
    const toIdx = toSel.selectedIndex;

    fromSel.selectedIndex = toIdx;
    toSel.selectedIndex = fromIdx;

    calculate();
  }

  function openConvert() {
    const sec = el("convert");
    if (!sec) return;
    sec.hidden = false;
    sec.style.display = "flex";

    setDimension("length");
  }

  function closeConvert() {
    const sec = el("convert");
    if (!sec) return;
    sec.hidden = true;
    sec.style.display = "none";
  }

  function init() {
    el("conv-btn-close-top")?.addEventListener("click", closeConvert);
    el("conv-btn-exit")?.addEventListener("click", closeConvert);
    el("conv-btn-invert")?.addEventListener("click", invertUnits);
    el("conv-input-val")?.addEventListener("input", calculate);
    el("conv-sel-from")?.addEventListener("change", calculate);
    el("conv-sel-to")?.addEventListener("change", calculate);

    document.querySelectorAll("input[name='conv-dim']").forEach((radio) => {
      radio.addEventListener("change", (e) => {
        if (e.target.checked) setDimension(e.target.value);
      });
    });

    window.openConvert = openConvert;
    window.closeConvert = closeConvert;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
