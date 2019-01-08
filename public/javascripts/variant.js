new Vue({
	el: "#variantPage",
	data: {
		display: "room", //default: main hall
		gameid: "undefined", //...yet
	},
	created: function() {
		// TODO: navigation becomes a little more complex
		const url = window.location.href;
		const hashPos = url.indexOf("#");
		if (hashPos >= 0)
			this.setDisplay(url.substr(hashPos+1));
	},
	methods: {
		setDisplay: function(elt) {
			this.display = elt;
			// Close menu on small screens:
			let menuToggle = document.getElementById("drawer-control");
			if (!!menuToggle)
				menuToggle.checked = false;
		},
	},
});
		
//const continuation = (localStorage.getItem("variant") === variant.name);
//			if (continuation) //game VS human has priority
//				this.continueGame("human");

// TODO:
// si quand on arrive il y a une continuation "humaine" : display="game" et retour à la partie !
