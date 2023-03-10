$(document).ready(async function () {
  const socket = io();
  setSocketListeners();

  const queryParams = new URLSearchParams(window.location.search);
  const gameId = queryParams.get('game');
  let game = null;
  let playerTurn = 0;

  if (gameId) {
    game = await getGameById(gameId);

    await renderPlayers(game);
    renderBoard();
    renderActionButtons();
    setBackNavigation();
    emitPlayerIn();
  }

  // FETCH
  async function getGameById(id) {
    const response = await fetch(`https://bdnhm2-3000.preview.csb.app:443/api/games/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })
    if (response.status != 404) {
      return response.json();
    } else {
      console.log("ERR")
      emitPlayerOut();
      navigateHome();
      return
    }

  }

  async function updateGame(game) {
    const response = await fetch(
      `https://bdnhm2-3000.preview.csb.app:443/api/games/${game._id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(game),
      }
    );
    return response.json();
  }

  async function getRooms() {
    const response = await fetch('https://bdnhm2-3000.preview.csb.app:443/api/rooms', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    return response.json();
  }

  async function updateRoom(room) {
    const response = await fetch(
      `https://bdnhm2-3000.preview.csb.app:443/api/rooms/${room._id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(room),
      }
    );
    return response.json();
  }

  async function getUser(id) {
    const response = await fetch(`https://bdnhm2-3000.preview.csb.app:443/api/users/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    return response.json();
  }

  function getUserFromLocalStorage() {
    const userStringified = localStorage.getItem('user');
    if (userStringified) {
      return JSON.parse(userStringified);
    }
    return null;
  }

  // RENDER

  function showUserContainer(idx, playerData) {
    const userContainer = $(`#player-${idx}`).get(0);
    $(userContainer).attr('data-user-id', playerData.playerId);
    $(userContainer).removeClass('hidden');
  }

  function paintUserLogo(image, idx) {
    const imageList = document.querySelectorAll(`#player-${idx} .user-logo`);

    if (imageList.length) {
      const imageElement = imageList[0];
      imageElement.setAttribute('src', image);
    }
  }

  function paintUserColor(color, idx) {
    const imageContainers = document.querySelectorAll(
      `#player-${idx} .user-logo`
    );

    if (imageContainers.length) {
      const container = imageContainers[0];
      $(container).css('-webkit-box-shadow', `0px 0px 1px 8px ${color}`);
      $(container).css('-moz-box-shadow', `0px 0px 1px 8px ${color}`);
      $(container).css('box-shadow', `0px 0px 1px 8px ${color}`);
    }
  }

  function paintUserName(name, idx) {
    const userSpans = document.querySelectorAll(`#player-${idx} .user-name`);
    if (userSpans.length) {
      const spanElement = userSpans[0];
      spanElement.textContent = name;
    }
  }

  function paintUserPoints(points, idx) {
    const userSpans = document.querySelectorAll(`#player-${idx} .user-points`);
    if (userSpans.length) {
      const spanElement = userSpans[0];
      spanElement.textContent = points;
    }
  }

  function renderUser(user, playerData, idx) {
    showUserContainer(idx, playerData);
    paintUserLogo(user.image, idx);
    paintUserName(user.name, idx);
    paintUserColor(user.color, idx);
    paintUserPoints(playerData.points, idx);
  }

  async function renderPlayers(game) {
    if (game && game.playersData && game.playersData.length) {
      let idx = 1;
      for (const playerData of game.playersData) {
        const user = await getUser(playerData.playerId);
        renderUser(user, playerData, idx);
        idx++;
      }
    }
  }

  function createBoardRow() {
    return $('<div>', { class: 'flex flex-rows board-row' });
  }

  function createBoardCell(i, j) {
    return $('<div>', {
      class: 'flex flex-rows board-cell',
      'data-row': i,
      'data-col': j,
    });
  }

  function renderBoard() {
    const board = $('#game-board').get(0);
    $(board).on('click', takeCell);
    for (let i = 0; i < 10; i++) {
      const row = createBoardRow();
      $(row).appendTo(board);
      for (let j = 0; j < 10; j++) {
        const cell = createBoardCell(i, j);
        $(cell).appendTo(row);
      }
    }
  }


  function renderActionButtons() {
    const user = getUserFromLocalStorage();
    const startButton = $(
      `[data-user-id=${user._id}] button.user-start-button`
    ).get(0);
    $(startButton).on('click', startGame);
    $(startButton).toggleClass('hidden');

    const endButton = $(
      `[data-user-id=${user._id}] button.user-exit-button`
    ).get(0);
    $(endButton).on('click', endGame);
  }

  async function renderTurn() {
    const turnSpan = $('span#turn').get(0);
    if (turnSpan) {
      const player = await getUser(playerTurn);
      if (player) {
        $(turnSpan).text(player.name);
      }
    }
  }

  // GAME LOGIC

  const columnasMarcadas = [];
  const filasMarcadas = [];

  function checkPartidaGanadora(rowId, colId) {

    //CREAMOS LOS ARRAYS
    columnasMarcadas.push(colId);
    filasMarcadas.push(rowId);

    //ORDENAMOS LOS NUMEROS
    columnasMarcadas.sort((a, b) => a - b);
    filasMarcadas.sort((a, b) => a - b);

    //ELIMINAMOS LOS DUPLICADOS
    const uniqueColumns = columnasMarcadas.filter((number, index, array) => array.indexOf(number) === index);
    const uniqueRows = filasMarcadas.filter((number, index, array) => array.indexOf(number) === index);

    //CONVERTIMOS LOS ARRAYS A NUMERO
    const uniqueColumnsAsNumbers = uniqueColumns.map(number => parseInt(number));
    const uniqueRowsAsNumbers = uniqueRows.map(number => parseInt(number));

    //COMPROBAMOS QUE SEA CONSECUTIVO, SI UNO DE LOS DOS LO ES, ENTONCES EL JUGADOR GANA

    if (consecutivos(uniqueColumnsAsNumbers) || consecutivos(uniqueRowsAsNumbers)) {
      alert('HAS GANADO! Ahora tienes un punto');
      actualizarPuntos(game);
      window.location.reload();
    }

  }

  function consecutivos(numbers) {
    if (numbers.length < 10) {
      // Si el array tiene menos de cinco elementos, no puede haber cinco n??meros consecutivos
      return false;
    }

    // Utilizamos un bucle para iterar sobre todas las subsecciones de tama??o 10 del array
    for (let i = 0; i <= numbers.length - 10; i++) {
      const subarray = numbers.slice(i, i + 10);  // Obtenemos una subsecci??n del array

      // Comprobamos si la subsecci??n es consecutiva utilizando el m??todo every()
      if (subarray.every((number, index) => number === subarray[0] + index)) {
        return true;
      }
    }

    // Si hemos llegado hasta aqu??, es que no hemos encontrado ninguna subsecci??n consecutiva de tama??o 5
    return false;
  }

  // ACTUALIZAR PUNTOS

  async function actualizarPuntos(game){


    let playerData = game.playersData;
    const userLocal = getUserFromLocalStorage();
    const userID = userLocal._id;

    const usuario = playerData.find(obj => obj.playerId === userID);
    let puntos;

    if (usuario) {
      puntos = usuario.points + 1;
      usuario.points = puntos;
    }

     updatePoints(game._id, playerData, "La partida ha comenzado")
  }



  function updatePoints(gameId, playersData, turn) {
    fetch('https://bdnhm2-3000.preview.csb.app:443/api/games/' + gameId, {
      method: 'PATCH',
      headers: {
      'accept': 'application/json',
      'Content-Type': 'application/json'
      },
      body: JSON.stringify({
      playersData: playersData,
      turn: turn
      })
    })
  }


  function getCellTarget(rowId, colId) {
    return $(`[data-row=${rowId}][data-col=${colId}]`).get(0);
  }

  function getUserColor(user) {
    return user && user.color ? user.color : '#000';
  }

  async function sendNextTurn() {
    const user = getUserFromLocalStorage();
    const turn = await getValidNextTurn();
    if (turn !== user._id) {
      emitTurn(turn);
    } else {
      alert('Juego finalizado');
      sendNextTurn();
      endGame();
    }
  }

  async function takeCell(event) {
    const user = getUserFromLocalStorage();
    if (playerTurn === user._id) {
      const cellTarget = event.target;
      const rowId = $(cellTarget).attr('data-row');
      const colId = $(cellTarget).attr('data-col');
      const cell = getCellTarget(rowId, colId);
      checkPartidaGanadora(rowId, colId);
      const userColor = getUserColor(user);
      $(cell).css('background-color', userColor);
      emitMovement({ rowId, colId, color: userColor });
      sendNextTurn();
    } else {
      alert('Espera tu turno');
    }
  }

  async function getValidNextTurn(playerId = null) {
    playerId = await getNextTurn(playerId);
    if (!(await isPlayerPlaying(playerId))) {
      return getValidNextTurn(playerId);
    }
    return playerId;
  }

  async function getNextTurn(playerId = null) {
    if (!playerId) {
      const user = getUserFromLocalStorage();
      playerId = user._id;
    }

    const game = await getGameById(gameId);
    if (game) {
      const playerIdx = game.playersData.findIndex(playerData => {
        return playerData.playerId === playerId;
      });

      return playerIdx < game.playersData.length - 1
        ? game.playersData[playerIdx + 1].playerId
        : game.playersData[0].playerId;
    }
    return 0;
  }

  function showExitButton(user) {
    const startButton = $(
      `[data-user-id=${user._id}] button.user-start-button`
    ).get(0);
    $(startButton).toggleClass('hidden');

    const endButton = $(
      `[data-user-id=${user._id}] button.user-exit-button`
    ).get(0);
    $(endButton).toggleClass('hidden');
  }

  async function changePlayerState(user, state) {
    game = await getGameById(gameId);
    const playerData = game.playersData.find(p => p.playerId === user._id);
    playerData.state = state;
  }

  function areAllPlayersReady(game) {
    return !game.playersData.some(pd => pd.state !== 'En progreso');
  }

  async function startGame() {
    const user = getUserFromLocalStorage();
    await changePlayerState(user, 'En progreso');
    const response = await updateGame(game);
    if (response) {
      showExitButton(user);
    }

    if (areAllPlayersReady(game)) {
      emitTurn(user._id);
    }
  }

  async function arePlayersPlaying() {
    const game = await getGameById(gameId);
    return game.playersData.some(pdata => pdata.state !== 'Salir');
  }

  async function endGame() {
    const user = getUserFromLocalStorage();
    await changePlayerState(user, 'Salir');
    const response = await updateGame(game);
    if (response) {
      if (playerTurn === user._id && (await arePlayersPlaying())) {
        const turn = await getValidNextTurn();
        if (turn !== user._id) {
          emitTurn(turn);
        }
      }
      const rooms = await getRooms();
      const myRoom = rooms.find(r => r.game === game._id);
      if (myRoom) {
        myRoom.users = myRoom.users.filter(userId => userId !== user._id);
        await updateRoom(myRoom);
        emitPlayerOut();
        navigateHome();
      }
    }
  }

  function emitMovement(movement) {
    socket.emit('movement', { gameTargetId: gameId, movement });
  }

  async function emitTurn(turn) {
    const game = await getGameById(gameId);
    game.turn = turn;
    await updateGame(game);
    socket.emit('turn', { gameTargetId: gameId, turn });
  }

  function emitPlayerIn() {
    socket.emit('playerIn');
  }

  function emitPlayerOut() {
    socket.emit('playerOut');
  }

  // NAVIGATION HEADER

  function setBackNavigation() {
    const backpathButton = $('#backpath').get(0);
    $(backpathButton).on('click', endGame);
  }

  function navigateHome() {
    window.location.replace('/room-game');
  }

  async function isPlayerPlaying(playerId) {
    const game = await getGameById(gameId);
    if (game) {
      const playerData = game.playersData.find(
        pdata => pdata.playerId === playerId
      );
      return playerData.state !== 'Salir';
    }
    return false;
  }

  // SOCKET
  function setSocketListeners() {
    socket.on('connect', () => { });

    socket.on('disconnect', () => {
      endGame();
    });

    socket.on('turn', async data => {
      const { gameTargetId, turn } = data;
      if (gameTargetId === gameId) {
        playerTurn = turn;
        renderTurn();
      }
    });

    socket.on('movement', data => {
      const { gameTargetId, movement } = data;
      const { rowId, colId, color } = movement;
      if (gameTargetId === gameId) {
        const cell = getCellTarget(rowId, colId);
        $(cell).css('background-color', color);
      }
    });

    socket.on('playerIn', async () => {
      game = await getGameById(gameId);
      await renderPlayers(game);
    });
  }
});
