/* global marbles */
(function demo() {
  const Marbles = marbles.default;
  const routes = {
    'root': {
      active: true,
      children: ['home', 'profile', 'user'],
      data: {},
      dependency: '',
      segment: ''
    },
    'home': {
      active: false,
      children: [],
      data: {},
      dependency: 'root',
      segment: 'home'
    },
    'profile': {
      active: false,
      children: [],
      data: {},
      dependency: 'root',
      segment: 'profile'
    },
    'user': {
      active: false,
      children: ['messages'],
      data: { userId: null },
      dependency: 'root',
      segment: 'users/:userId'
    },
    'messages': {
      active: false,
      children: ['messages-compose'],
      data: {},
      dependency: 'user',
      segment: 'messages'
    },
    'messages-compose': {
      active: false,
      children: ['messages-inbox', 'messages-detail'],
      data: {},
      dependency: 'messages',
      segment: 'compose'
    },
    'messages-inbox': {
      active: false,
      children: [],
      data: {},
      dependency: 'messages',
      segment: 'inbox'
    },
    'messages-detail': {
      active: false,
      children: [],
      data: {},
      dependency: 'messages',
      segment: 'inbox/:messageId'
    }
  };
  const homeTab = document.getElementById('home-tab');
  const profileTab = document.getElementById('profile-tab');
  const messagesTab = document.getElementById('messages-tab');
  const home = document.getElementById('home');
  const profile = document.getElementById('profile');
  const messages = document.getElementById('messages');
  const messagesCompose = document.getElementById('messages-compose');
  const messagesInbox = document.getElementById('messages-inbox');
  const messagesDetail = document.getElementById('messages-detail');
  const showInbox = document.getElementById('show-inbox-button');
  const showCompose = document.getElementById('show-compose-button');
  const marble = new Marbles(routes);
  window.marble = marble;
  function hide(element) {
    element.style.display = 'none';
  }
  function show(element) {
    element.style.display = 'block';
  }
  function isHidden(element) {
    return element.currentStyle ? element.currentStyle.display === 'none' :
      getComputedStyle(element, null).display === 'none';
  }
  marble.subscribe({
    'home': {
      inserted: () => {
        homeTab.classList.add('active');
        show(home);
      },
      removed: () => {
        homeTab.classList.remove('active');
        hide(home);
      }
    },
    'profile': {
      inserted: () => {
        profileTab.classList.add('active');
        show(profile);
      },
      removed: () => {
        profileTab.classList.remove('active');
        hide(profile);
      }
    },
    'messages': {
      inserted: (data) => {
        messagesTab.classList.add('active');
        document.getElementById('messages-user').innerHTML = `User #${data.userId}`;
        show(messages);
      },
      removed: () => {
        messagesTab.classList.remove('active');
        hide(messages);
      }
    },
    'messages-compose': {
      inserted: () => {
        show(messagesCompose);
      },
      removed: () => {
        hide(messagesCompose);
      }
    },
    'messages-inbox': {
      inserted: () => {
        show(messagesInbox);
      },
      removed: () => {
        hide(messagesInbox);
      }
    },
    'messages-detail': {
      inserted: (data) => {
        show(messagesInbox);
        show(messagesDetail);
        document.querySelectorAll('.email-details').forEach(el => {
          hide(el);
        });
        show(document.getElementById(`details-${data.messageId}`));
      },
      removed: () => {
        hide(messagesInbox);
        hide(messagesDetail);
      }
    }
  });
  document.querySelectorAll('.email').forEach((el) => {
    el.addEventListener('click', () => {
      marble.insert('messages-detail', {
        messageId: el.id.substr('email-'.length)
      });
    });
  });
  showInbox.addEventListener('click', () => {
    if (isHidden(messagesInbox)) {
      marble.insert('messages-inbox');
    } else {
      marble.remove('messages-inbox');
    }
  });
  showCompose.addEventListener('click', () => {
    if (isHidden(messagesCompose)) {
      marble.insert('messages-compose');
    } else {
      marble.remove('messages-compose');
    }
  });
  marble.step();
  marble.start();
}());

