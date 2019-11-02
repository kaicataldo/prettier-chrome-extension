import { BUTTONS, BUTTONS_TO_SEARCH_FOR, renderButton } from "./button";
import { PRETTIER_PLUGINS } from "./parsers";
import { findWithClass } from "./utils";
import prettier from "prettier/standalone";

const GITHUB_VALID_PATHNAMES = /^\/.*\/.*\/(?:pull\/\d+(?:\/?|\/files\/?)$|commit|compare\/.*|issues\/\d+|issues\/new)/u;
const JS_DIFF_CONTAINER_CLASS = ".js-diff-progressive-container";
const COMMENT_TIMELINE_GROUP_CLASS = ".timeline-comment-group";
const { COMMENT, REPLY } = BUTTONS;

export default class GitHub {
  constructor(storage) {
    this._isGithubListenerAdded = false;
    this._currentUrlPath = window.location.pathname;
    this._storage = storage;
    this._init();
  }

  _init() {
    if (!this._isGithubListenerAdded) {
      const commentObserver = new MutationObserver(() => {
        this._initGitHubButton();
      });
      const newCommentObserver = new MutationObserver(() => {
        commentObserver.disconnect();
        this._resetGithubCommentObserver(commentObserver);
        this._initGitHubButton();
      });
      const pageObserver = new MutationObserver(() => {
        if (window.location.pathname !== this._currentUrlPath) {
          this._currentUrlPath = window.location.pathname;
          this._initGitHubButton();

          commentObserver.disconnect();
          this._resetGithubCommentObserver(commentObserver);
          this._resetGithubNewCommentObserver(newCommentObserver);
        }
      });
      pageObserver.observe(document.querySelector("body"), {
        childList: true
      });

      this._resetGithubCommentObserver(commentObserver);
      this._resetGithubNewCommentObserver(newCommentObserver);
      this._isGithubListenerAdded = true;
    }
    this._initGitHubButton();
  }

  _initGitHubButton() {
    if (GITHUB_VALID_PATHNAMES.test(window.location.pathname)) {
      this._createGithubPrettierButtons();
    }
  }

  _resetGithubNewCommentObserver(observer) {
    const content = document.querySelector(".js-discussion");
    if (content) {
      observer.disconnect();
      observer.observe(content, { childList: true, subtree: true });
    }
  }

  _resetGithubCommentObserver(observer) {
    for (const elem of document.querySelectorAll(
      COMMENT_TIMELINE_GROUP_CLASS
    )) {
      observer.observe(elem, {
        attributes: true,
        childList: true,
        subtree: true
      });
    }

    for (const elem of document.querySelectorAll(JS_DIFF_CONTAINER_CLASS)) {
      observer.observe(elem, {
        childList: true,
        subtree: true
      });
    }
  }

  _createGithubPrettierButtons() {
    const BUTTON_STYLE = { float: "left", "margin-right": "10px" };
    const createList = this._seachForGithubButtons();

    for (const button of createList) {
      let prettierBtn = button.parentNode.querySelector(".prettier-btn");
      if (prettierBtn === null) {
        prettierBtn = renderButton(button.parentNode, {
          append: true,
          classes: ["prettier-btn"],
          refNode: button,
          style: BUTTON_STYLE
        });
      }

      const textArea = findWithClass(prettierBtn, "comment-form-textarea");
      prettierBtn.addEventListener("click", event => {
        event.preventDefault();
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
    }
  }

  _seachForGithubButtons() {
    const buttons = document.getElementsByTagName("button");
    const createList = [];
    for (const button of buttons) {
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
      if (button.innerText === REPLY) {
        const observer = new MutationObserver(() => {
          this._createGithubPrettierButtons();
        });
        observer.observe(
          findWithClass(button, "inline-comment-form-container"),
          {
            attributes: true
          }
        );
      }
    }
    return createList;
  }
}
