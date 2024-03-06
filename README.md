# run-in-jupyter README

This VSCode extension enables the execution of selected code snippets or entire code blocks from a Python file within a Jupyter environment.

## Requirements

This extension requires the [Jupyter](https://marketplace.visualstudio.com/items?itemName=ms-toolsai.jupyter) extension by Microsoft. It just sends the code to the Jupyter extension and runs it.

## Usage

1. <kbd>Shift</kbd>+<kbd>Enter</kbd> for **Running** the current block of code and make your cursor **Move Down** to the start of next block. So you can do this repeatedly.
2. <kbd>Alt</kbd>+<kbd>Q</kbd> for **Just Running** the current block of code. This may be useful for testing some random-result code. You can customize the keybinding in VSCode.
3. Select some code. Either 1 or 2 will run the selected code.

![demo](./assets/demo.gif)

## Notes

- It will be better to use a formatter like [Black Formatter](https://marketplace.visualstudio.com/items?itemName=ms-python.black-formatter) to format your code before running it.
- Python Multi-Line String is not supported yet. You can select the code and run it.
