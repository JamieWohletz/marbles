/* global Marbles */
(function demo() {
  const routes = [
    {
      id: 'home',
      fragment: 'home',
      rule: Marbles.rules.childOf('root')
    },
    {
      id: 'profile',
      fragment: 'profile',
      rule: Marbles.rules.childOf('root')
    },
    {
      id: 'user',
      fragment: 'users/{userId}',
      rule: Marbles.rules.childOf('root'),
      tokens: {
        userId: Marbles.Regex.DIGITS
      }
    },
    {
      id: 'messages',
      fragment: 'messages',
      rule: Marbles.rules.childOf('user')
    },
    {
      id: 'messages-compose',
      fragment: 'compose',
      rule: Marbles.rules.descendsFrom('messages')
    },
    {
      id: 'messages-inbox',
      fragment: 'inbox',
      rule: Marbles.rules.descendsFrom('messages')
    },
    {
      id: 'messages-detail',
      fragment: '{messageId}',
      rule: Marbles.rules.childOf('messages-inbox'),
      tokens: {
        messageId: Marbles.Regex.DIGITS
      }
    }
  ];
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
  const marbles = new Marbles(routes);
  window.marble = marbles;
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
  marbles.subscribe({
    'home': {
      activated: () => {
        homeTab.classList.add('active');
        show(home);
      },
      deactivated: () => {
        homeTab.classList.remove('active');
        hide(home);
      }
    },
    'profile': {
      activated: () => {
        profileTab.classList.add('active');
        show(profile);
      },
      deactivated: () => {
        profileTab.classList.remove('active');
        hide(profile);
      }
    },
    'messages': {
      activated: (data) => {
        messagesTab.classList.add('active');
        document.getElementById('messages-user').innerHTML = `User #${data.userId}`;
        show(messages);
      },
      deactivated: () => {
        messagesTab.classList.remove('active');
        hide(messages);
      }
    },
    'messages-compose': {
      activated: () => {
        show(messagesCompose);
      },
      deactivated: () => {
        hide(messagesCompose);
      }
    },
    'messages-inbox': {
      activated: () => {
        show(messagesInbox);
      },
      deactivated: () => {
        hide(messagesInbox);
      }
    },
    'messages-detail': {
      activated: (data) => {
        show(messagesInbox);
        show(messagesDetail);
        document.querySelectorAll('.email-details').forEach((el) => {
          hide(el);
        });
        show(document.getElementById(`details-${data.messageId}`));
      },
      deactivated: () => {
        hide(messagesDetail);
      }
    }
  });
  document.querySelectorAll('.email').forEach((el) => {
    el.addEventListener('click', () => {
      marbles.activate('messages-detail', {
        messageId: el.id.substr('email-'.length)
      });
    });
  });
  showInbox.addEventListener('click', () => {
    if (isHidden(messagesInbox)) {
      marbles.activate('messages-inbox');
    } else {
      marbles.deactivate('messages-inbox');
    }
  });
  showCompose.addEventListener('click', () => {
    if (isHidden(messagesCompose)) {
      marbles.activate('messages-compose');
    } else {
      marbles.deactivate('messages-compose');
    }
  });
  marbles.start();
}());

