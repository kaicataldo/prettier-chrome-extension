import { BUTTONS, BUTTONS_TO_SEARCH_FOR, renderButton } from "./button";
import { PRETTIER_PLUGINS } from "./parsers";
import { findWithClass } from "./utils";
import prettier from "prettier/standalone";

const { COMMENT, REPLY } = BUTTONS;
const GITHUB_VALID_PATHNAMES = /^\/.*\/.*\/(?:pull\/\d+(?:\/?|\/files\/?)$|commit|compare\/.*|issues\/\d+|issues\/new)/u;

export default class GitHub {
  constructor(storage) {
    this._storage = storage;
    this._currentUrlPath = window.location.pathname;
    this._buttons = new Map();
    this._observers = {
      comments: null,
      page: null
    };
    this._setUpObservers();
    this._initButtons();
  }

  _setUpObservers() {
    if (!this._observers.page) {
      this._observers.page = new MutationObserver(() => {
        if (window.location.pathname !== this._currentUrlPath) {
          this._currentUrlPath = window.location.pathname;
          this._initButtons();
        }
      });
    }

    if (!this._observers.comments) {
      this._observers.comments = new MutationObserver(() => {
        this._initButtons();
      });
    }

    for (const elem of document.querySelectorAll(".timeline-comment-group")) {
      this._observers.comments.observe(elem, {
        attributes: true,
        childList: true,
        subtree: true
      });
    }

    for (const elem of document.querySelectorAll(
      ".js-diff-progressive-container"
    )) {
      this._observers.comments.observe(elem, {
        childList: true,
        subtree: true
      });
    }

    const content = document.querySelector(".js-discussion");

    if (content) {
      this._observers.comments.observe(content, {
        childList: true,
        subtree: true
      });
    }

    for (const elem of document.getElementsByTagName("button")) {
      if (elem.innerText === REPLY) {
        this._observers.comments.observe(
          findWithClass(elem, "inline-comment-form-container"),
          {
            attributes: true
          }
        );
      }
    }

    this._observers.page.observe(document.querySelector("body"), {
      childList: true
    });
  }

  _disconnectObservers() {
    Object.values(this._observers).forEach(observer => observer.disconnect());
  }

  _initButtons() {
    this._disconnectObservers();

    if (GITHUB_VALID_PATHNAMES.test(window.location.pathname)) {
      this._createButtons();
    }

    this._setUpObservers();
  }

  _createButtons() {
    const BUTTON_STYLE = { float: "left", "margin-right": "10px" };
    const createList = this._seachForGithubButtons();

    for (const button of createList) {
      let prettierBtn = button.parentNode.querySelector(".prettier-btn");

      if (this._buttons.has(prettierBtn)) {
        continue;
      }

      prettierBtn = renderButton(button.parentNode, {
        append: true,
        classes: ["prettier-btn"],
        refNode: button,
        style: BUTTON_STYLE
      });
      prettierBtn.addEventListener("click", event => {
        event.preventDefault();
        const textArea = findWithClass(prettierBtn, "comment-form-textarea");
        const formattedText = prettier.format(textArea.value, {
          parser: "markdown",
          plugins: PRETTIER_PLUGINS,
          ...this._storage.get()
        });
        textArea.focus();
        textArea.select();
        document.execCommand("delete", false, null);
        document.execCommand("insertText", false, formattedText);
      });
      this._buttons.set(prettierBtn, true);
    }
  }

  _seachForGithubButtons() {
    const createList = [];

    for (const button of document.getElementsByTagName("button")) {
      if (BUTTONS_TO_SEARCH_FOR.includes(button.innerText)) {
        if (
          button.innerText === COMMENT &&
          (button.parentNode.parentNode.querySelector(
            "button[name=comment_and_close]"
          ) ||
            button.parentNode.parentNode.querySelector(
              "button[data-confirm-cancel-text]"
            ))
        ) {
          continue;
        }

        createList.push(button);
      }
    }

    return createList;
  }
}
